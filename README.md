# Emper

AI-powered job matching that understands who you actually are — not just your keywords.

Two-sided platform: candidates upload documents and share their goals via chat; companies post roles with requirements and culture context. An LLM-backed matching engine connects them with scored, explainable results.

---

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL + pgvector** — structured data + vector similarity search
- **Drizzle ORM** — schema and queries
- **Anthropic Claude** (`claude-sonnet-4-6`) — goals chat, document context extraction, match scoring
- **OpenAI** (`text-embedding-3-small`) — embedding generation
- **JWT** via `jose` — auth (httpOnly cookie)

---

## Getting started

### 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for the local Postgres + pgvector database)
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 2. Clone and install

```bash
git clone <your-repo>
cd emper-ai
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```env
DATABASE_URL=postgresql://emper:emper_secret@localhost:5432/emper

# Generate with: openssl rand -base64 32
JWT_SECRET=your-secret-here

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start the database

```bash
docker compose up -d
```

### 5. Push the schema

```bash
npm run db:push
```

> First run only. Re-run after schema changes.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## App flow

**Candidates**
1. Sign up → select "I'm a candidate"
2. Upload documents (resume, LinkedIn PDF, SOP, anything relevant) — kept private
3. Chat with the AI guide to capture goals, culture preferences, comp expectations
4. Dashboard shows ranked job matches with explanations

**Companies**
1. Sign up → select "I'm hiring"
2. Fill in job title, hard/soft requirements, comp range
3. Optionally upload culture docs, full JD, team bios
4. Dashboard shows ranked candidate pipeline per role

---

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `docker compose up -d` | Start Postgres in background |
| `docker compose down` | Stop Postgres |

---

## TODOs

### Core functionality
- [ ] **pgvector native columns** — currently embeddings are stored as text and deserialized in-app; migrate to native `vector(1536)` columns with HNSW index for proper ANN search at scale
- [ ] **Unique constraint on matches** — add `UNIQUE(candidate_id, job_id)` at the DB level (currently handled in app logic only)
- [ ] **Background match computation** — move `runMatchesForCandidate` to a background job (queue or cron) so it doesn't block the API response
- [ ] **Onboarding completion gating** — redirect to onboarding if incomplete before allowing dashboard access

### Candidate experience
- [ ] **Voice input** — add Whisper-based voice transcription to the goals chat (Web Speech API fallback for browsers)
- [ ] **Document re-upload** — let candidates add/remove documents after initial onboarding
- [ ] **Profile editor** — UI to view and edit the extracted context (skills, working style, etc.)
- [ ] **Match explanations** — deeper breakdown UI showing exactly which signals drove each match

### Company experience
- [ ] **Multiple job postings** — currently creates a new job per onboarding flow; add a dashboard to manage multiple active roles
- [ ] **Candidate actions** — bookmark, pass, or request intro from the company dashboard
- [ ] **Employee CV ingestion** — use existing employee profiles to infer culture fit patterns

### Infrastructure
- [ ] **Email auth / magic links** — replace password auth with email OTP or OAuth (Google)
- [ ] **File storage** — store uploaded files in S3/R2 instead of processing in-memory only
- [ ] **Rate limiting** — add rate limits on `/api/ingest` and `/api/chat` routes
- [ ] **Error monitoring** — wire up Sentry or similar
- [ ] **Deployment** — Vercel (app) + Supabase or Neon (managed Postgres + pgvector)
