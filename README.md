# Emper

**AI-powered job matching that understands who you actually are — not just your keywords.**

Most matching platforms compare lists of skills. Emper builds a grounded persona for each candidate from public sources (GitHub, LinkedIn, portfolio, papers) plus an optional "behavioral profile" the candidate generates from their past AI chat history, then has two AI personas — one representing the candidate, one representing the role — hold an adversarial conversation. An independent judge reads the transcript and decides whether the match is worth surfacing to a human.

The product is two-sided:
- **Candidates** upload documents, optionally paste a behavioral profile, and chat with Kira (the on-platform AI) to fill gaps. Emper rebuilds their persona and shows ranked role intros.
- **Companies** post roles with hard requirements, soft preferences, and culture context. Emper screens candidates against the role persona and surfaces only the matches the judge thinks are worth a human's time.

---

## Architecture at a glance

This repo is a **hybrid monorepo with two services that talk over HTTP**:

```
┌─────────────────────────────────────────┐         ┌────────────────────────┐
│  Next.js app (root)                     │         │  Python agent service  │
│  ─────────────────────                  │         │  izhaar-agents/        │
│  • UI (App Router, Tailwind)            │         │  ────────────────       │
│  • Auth (JWT in httpOnly cookie)        │         │  • profile-builder      │
│  • Scraper (GitHub, websites, papers)   │ ──────▶ │  • role-builder         │
│  • Postgres (Drizzle ORM)               │  HTTP   │  • adversarial          │
│  • Persistence: personas, transcripts,  │   :8000 │    conversation         │
│    verdicts                             │ ◀────── │  • independent judge    │
│                                         │  JSON   │  • anti-sycophancy      │
│  • Kira (on-platform chat with cand.)   │         │    detector (Haiku)     │
└─────────────────────────────────────────┘         └────────────────────────┘
            ↕                                                   ↕
       Postgres :5432                                    Anthropic API
       (pgvector)                                        (Sonnet 4.6)
```

**Why two services?** Python owns the agentic pipeline (it's where the prompts, the persona Pydantic models, and the streaming conversation orchestrator live). Next.js owns persistence, UI, and the user-facing flow. They communicate via a typed HTTP boundary in [`src/lib/agents-client.ts`](src/lib/agents-client.ts). Python is **stateless** — Next.js sends candidate + role personas on every match call; Python computes and returns; Next.js persists.

**The four-job pipeline** (Python side, [`izhaar-agents/src/agents/`](izhaar-agents/src/agents/)):
1. **Profile builder** — multi-source extraction. Pass 1 extracts claims from scraped data, pass 2 extracts claims from the pasted AI chat history, pass 3 merges them with `corroboration_count` and `discrepancy_flag` per claim.
2. **Role builder** — extracts claims from a job description + company context.
3. **Adversarial conversation** — two LLM personas talk; both can walk away if the fit isn't real. Every 4 turns a Haiku-based detector watches for sycophantic convergence and injects a probing prompt.
4. **Judge** — independent LLM reads transcript + both evidence bases, returns a verdict (`strong | good | marginal | no_match`) and decides whether to surface to a human.

Stack details:
- Next.js 15 (App Router, TypeScript, Tailwind CSS)
- PostgreSQL 16 + pgvector
- Drizzle ORM
- JWT via `jose` (httpOnly cookie)
- Anthropic Claude `sonnet-4-6` (build, conversation, judge), `haiku-4-5` (sycophancy detector)
- OpenAI `text-embedding-3-small` (vector similarity for the legacy matcher; not used in the integrated path)

---

## Prerequisites

- **Docker Desktop** (or OrbStack) — for Postgres + pgvector
- **Node.js 20+** — Next.js requires it
- **Python 3.11+** — for the agent service. Python 3.9 works too if you install Pydantic v2 separately.
- **Anthropic API key** — `sk-ant-...` from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI API key** — only needed if you want the legacy vector-similarity scoring or embeddings. The integrated path doesn't require it.

---

## Quick start (10 minutes)

### 1. Clone and install Node deps

```bash
git clone <your-repo>
cd emper-ai
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://emper:emper_secret@localhost:5432/emper

# Generate with: openssl rand -base64 32
JWT_SECRET=replace-me

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                # optional for the integrated path

NEXT_PUBLIC_APP_URL=http://localhost:3000
AGENTS_BASE_URL=http://localhost:8000
AGENTS_API_KEY=                       # leave blank in dev
```

And create the Python service's env file:

```bash
cp izhaar-agents/.env.example izhaar-agents/.env
```

Then edit `izhaar-agents/.env` and set `ANTHROPIC_API_KEY=sk-ant-...` (same value is fine).

### 3. Start Postgres

```bash
docker compose up -d postgres
```

The healthcheck takes ~10s. Verify it's ready: `docker compose ps` should show `(healthy)`.

### 4. Push the schema

```bash
npm run db:push
```

First run only. Re-run after any change to [`src/db/schema.ts`](src/db/schema.ts).

### 5. Start the Python agent service

In a separate terminal:

```bash
cd izhaar-agents
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
PYTHONPATH=. python3 -m uvicorn src.main:app --port 8000
```

Leave this terminal running. Verify the service is up: `curl http://localhost:8000/healthz` should return `{"status":"ok","service":"izhaar-agents"}`.

### 6. Start the Next.js dev server

In a third terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. (Optional) Seed a demo candidate and run the pipeline

The fastest way to see the whole thing work without manually clicking through onboarding:

```bash
# Insert Maya Chen (a synthetic ML engineer) into Postgres with 4 source documents
node_modules/.bin/tsx --env-file=.env.local scripts/seed-demo-candidate.ts

# Insert Modal Labs + Perplexity as two demo roles (one strong-fit, one likely walk-away)
node_modules/.bin/tsx --env-file=.env.local scripts/seed-demo-roles.ts

# Run the whole pipeline end-to-end: persona build (~90s) + 2 matches (~30-90s each)
node_modules/.bin/tsx --env-file=.env.local scripts/run-demo-e2e.ts
```

Cost: about **$0.30–0.50** in Anthropic API charges for the full e2e.

Then log in at [http://localhost:3000/login](http://localhost:3000/login) as `maya@demo.izhaar.local` / `demo-only-not-real`. Visit `/candidate/conversation/<id>` to see the transcript for any of the matches (find IDs in `candidate_conversations` table or in the script's output).

---

## App flow

**Candidates** ([`src/components/emper/Workspace.tsx`](src/components/emper/Workspace.tsx))
1. Sign up → select "I'm a candidate"
2. Upload documents (resume, GitHub URL, portfolio URL, paper URL)
3. Optionally paste an AI-generated behavioral profile (Kira asks you to via the [Add chat history] CTA on Self)
4. The persona-rebuild trigger fires; Python builds a multi-source persona in ~90s
5. Dashboard shows the persona (Self) + ranked role intros (Intros)
6. Click an intro to see the full adversarial conversation transcript and judge verdict

**Companies** ([`src/app/company/onboarding/page.tsx`](src/app/company/onboarding/page.tsx))
1. Sign up → select "I'm hiring"
2. Fill in title, hard/soft requirements, comp range, deal-breakers
3. Optionally upload culture docs, the full JD, or paste team bios
4. Dashboard shows the candidate pipeline ranked by judge confidence

---

## How matching actually works

When [`/api/match/run`](src/app/api/match/run/route.ts) is called for a candidate:

1. **Pull the candidate's persona** from `candidate_personas` (built earlier by the persona-rebuild trigger).
2. For each active job (capped at 10/run for cost):
   1. Build the role persona inline by calling Python's [`POST /api/v1/build/role-from-payload`](izhaar-agents/src/api/routes.py).
   2. Call Python's [`POST /api/v1/match/run-from-payload`](izhaar-agents/src/api/routes.py) with both personas in the body.
   3. Python runs: **pre-filter** (location + comp overlap, cheap and no-LLM) → **adversarial conversation** (8–12 turns, both personas can walk away) → **judge** (independent LLM, returns verdict + reasoning).
   4. Next.js persists the transcript in `candidate_conversations` and the verdict in `candidate_verdicts`.
3. The Intros UI reads `candidate_verdicts` filtered to `surface_to_human = true` (the strong + good buckets).

**The pre-filter only knocks out on explicit constraints** (location mismatch, comp range disjoint). Tag overlap is informational only — see the comment in [`src/filters/pre_filter.py`](izhaar-agents/src/filters/pre_filter.py).

**The judge reads the underlying evidence**, not just the transcript. This is the safeguard against "two articulate AIs had a pleasant chat" being mistaken for fit. See [`izhaar-agents/src/prompts/judge_prompt.py`](izhaar-agents/src/prompts/judge_prompt.py).

---

## Key directories

```
emper-ai/
├── src/                              # Next.js
│   ├── app/                          # App Router pages + API routes
│   │   ├── api/
│   │   │   ├── ingest/               # Where new candidate docs land
│   │   │   │   ├── candidate/        # File uploads (resume, etc.)
│   │   │   │   ├── github/           # GitHub username → scraped repo bundle
│   │   │   │   ├── source/           # Website / portfolio / paper URLs
│   │   │   │   └── chat-history/     # NEW: pasted AI behavioral profile
│   │   │   ├── match/                # /run, /run-stream, /conversation/[id]
│   │   │   ├── matches/              # Intros list
│   │   │   └── candidate/persona/    # Inspect the built persona
│   │   ├── candidate/conversation/[id]/   # The walk-away viewer
│   │   └── (auth)/
│   ├── lib/
│   │   ├── agents-client.ts          # The network boundary — only file that talks to Python
│   │   ├── persona-store.ts          # candidate_personas + dual-write to goals
│   │   ├── persona-rebuild.ts        # Debounced trigger fired on every ingest
│   │   ├── prompts/chat-history-user-prompt.ts  # What the candidate pastes into Claude/GPT
│   │   ├── claude.ts                 # Kira chat (NOT match scoring — deprecated)
│   │   ├── matching.ts               # DEPRECATED — the old vector+LLM matcher
│   │   ├── github-scraper.ts         # Astha's scraper layer
│   │   ├── github-analyzer.ts        # Claude-synthesized project descriptions
│   │   ├── source-scraper.ts         # URL → markdown
│   │   └── website-crawler.ts        # BFS crawler for company sites
│   ├── components/emper/             # The candidate workspace UI
│   │   ├── Workspace.tsx
│   │   ├── Onboarding.tsx
│   │   ├── KiraChatModal.tsx
│   │   ├── ChatHistoryPasteModal.tsx # NEW
│   │   └── pages/{Self,Intros,Tracker,Documents,Chats}Page.tsx
│   └── db/
│       └── schema.ts                 # Drizzle schema (incl. candidate_personas, _conversations, _verdicts)
│
├── izhaar-agents/                    # Python agent service
│   ├── src/
│   │   ├── agents/                   # profile_builder, role_builder, conversation, judge
│   │   ├── prompts/                  # all system prompts as Python constants
│   │   ├── models/persona.py         # Pydantic models (Claim, SourceAttribution, CandidatePersona, RolePersona)
│   │   ├── filters/pre_filter.py     # Location + comp checks
│   │   ├── api/routes.py             # FastAPI routes (build, match, healthz)
│   │   ├── api/_payloads.py          # Request body models
│   │   └── api/_auth.py              # X-Agents-Key dependency (no-op when env unset)
│   ├── static/index.html             # Standalone demo UI (works without Next.js)
│   └── tests/                        # 56 pytest tests
│
├── scripts/
│   ├── seed-demo-candidate.ts        # Insert Maya Chen + 4 docs into Postgres
│   ├── seed-demo-roles.ts            # Insert Modal Labs + Perplexity
│   ├── run-demo-e2e.ts               # Full pipeline test (persona + 2 matches)
│   ├── pydriller_analyze.py          # Helper invoked by github-scraper for commit selection
│   └── part2-artifacts/              # Sample DB rows demonstrating persona/freshness/dual-write
│
├── data/                             # Audit copies of scraped markdown (Postgres is canonical)
│   ├── github/
│   ├── sources/
│   └── resume-projects/
│
└── docker-compose.yml                # pgvector/pgvector:pg16
```

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run db:push` | Sync `src/db/schema.ts` to Postgres |
| `npm run db:studio` | Open Drizzle Studio (DB GUI in browser) |
| `docker compose up -d postgres` | Start Postgres in background |
| `docker compose down` | Stop Postgres (data persists in named volume) |
| `cd izhaar-agents && PYTHONPATH=. python3 -m uvicorn src.main:app --port 8000` | Start the Python agent service |
| `cd izhaar-agents && PYTHONPATH=. python3 -m pytest -q` | Run the Python test suite (56 tests) |
| `tsx --env-file=.env.local scripts/seed-demo-candidate.ts` | Seed Maya as a demo candidate |
| `tsx --env-file=.env.local scripts/seed-demo-roles.ts` | Seed Modal + Perplexity as demo roles |
| `tsx --env-file=.env.local scripts/run-demo-e2e.ts` | End-to-end test |

---

## Troubleshooting

**`docker compose ps` shows the Postgres container exists but is unhealthy.** Wait 10-15 seconds after `docker compose up`; the pgvector image takes a moment for its first init. If it stays unhealthy, check `docker compose logs postgres` — most often this is a port conflict (another Postgres listening on 5432).

**`npm run db:push` says `Cannot find module 'dotenv'`.** Run `npm install dotenv --save-dev`. The Drizzle config requires it.

**Match runs time out at 30 seconds.** A full match is 30–60 seconds normally, but the build step does up to 3 LLM calls (scraper extract → chat history extract → merge) and can take >5 minutes on a slow Anthropic day. Timeouts are set in [`src/lib/agents-client.ts`](src/lib/agents-client.ts) — build is 10 min, match is 90s, healthcheck is 3s. If a real match exceeds these, Anthropic is degraded; check `status.anthropic.com`.

**Behavioral fields in `candidates.goals` (working_style, communication_style, etc.) are empty.** This is intentional. The dual-write in [`src/lib/persona-store.ts`](src/lib/persona-store.ts) only populates these from claims tagged by Python's `AI_CHAT_HISTORY_EXTRACTION_PROMPT`. If the candidate hasn't pasted in their AI chat history, those fields stay empty and Kira asks about them via the gap-questions flow. To populate them, paste a behavioral profile via the [Add chat history] CTA on the Self page.

**Python service rejects requests with 401 when both env-side keys are set.** If you set `AGENTS_API_KEY` in either `.env.local` or `izhaar-agents/.env` but not both, the side without the key will be rejected by the side that has it. Either set both to the same value (production) or leave both blank (dev — the dependency is a no-op).

**The standalone Python UI at `localhost:8000` shows 401 errors in the browser console.** Same root cause — if you set `AGENTS_API_KEY` on the Python side, the browser-side fetches from the static UI can't include the header. Set `AGENTS_API_KEY=""` for standalone UI testing.

**A match returns `verdict: no_match` for a candidate × role pair that I thought would match.** Two things to check before chasing a prompt bug: (1) read the full transcript at `/candidate/conversation/<id>` — the judge is conservative on purpose ("when in doubt, lean toward marginal or no_match") and a max_turns termination without convergence routinely scores `no_match`. (2) Inspect `evidenceFor` and `evidenceAgainst` in the verdict row — if the judge's reasoning makes sense given what was actually discussed, the prompts are working as designed. If the conversation never surfaced the real fit signal, the role-builder or profile-builder prompt may need tuning.

---

## TODOs

### Core integration
- [ ] **Cache role personas** in a `role_personas` table so we don't rebuild on every match (currently inline, ~$0.03/role/match)
- [ ] **Background job for persona rebuild** — current implementation is in-memory debounce in `persona-rebuild.ts`. Production needs a real queue (BullMQ + Redis, or a serverless queue) so debounce survives restarts and parallelizes across candidates.
- [ ] **Migrate Kira to read from persona claims** instead of `candidates.goals` — see the dual-write comment in `persona-store.ts`. Until then `goals` is a derived view we keep in sync.
- [ ] **Streaming match UI** — the Python service already streams events via `/match/run-stream` (used by the standalone UI). The Next.js side runs matches synchronously. Wire SSE through to the dashboard.

### Onboarding polish
- [ ] **Inline ChatHistoryStep in Onboarding** — currently the paste flow is a modal accessible from Self. Make it a proper step between "dump documents" and "first chat with Kira".
- [ ] **Voice input** for Kira chat (Whisper or Web Speech API)
- [ ] **Onboarding completion gating** — redirect to onboarding if `users.onboarding_complete = false` before allowing dashboard

### Infrastructure
- [ ] **pgvector native columns** — currently embeddings are `text`; migrate to `vector(1536)` with HNSW
- [ ] **File storage in S3/R2** instead of in-memory parsing
- [ ] **Rate limiting** on `/api/ingest` and `/api/chat`
- [ ] **Sentry / error monitoring** wired in
- [ ] **Email magic links** instead of password auth
- [ ] **Deployment** — Vercel for the Next.js app, a managed Python host for `izhaar-agents/` (Fly.io or Railway), Neon or Supabase for Postgres+pgvector

### Future agent layer work
- [ ] **Persistent role personas** with cache invalidation when the underlying job row changes
- [ ] **Company-side matching** — currently runs through the deprecated `matches` table; move to the Python pipeline
- [ ] **Human-in-the-loop review** for claims before they go to companies (especially for `discrepancy_flag` claims)
- [ ] **Per-prompt version tracking** — already stamped via `modelVersion` column; add a tool to diff verdicts across prompt versions
