# izhaar-agents

Python service for Izhaar's four-job agent layer:

1. **Profile-builder** — turns scraper output into a grounded candidate persona.
2. **Role-builder** — turns role + company data into a grounded role persona.
3. **Conversation orchestrator** — runs an adversarial conversation between the two personas, with anti-sycophancy injection.
4. **Independent judge** — reads transcript + both evidence bases and renders a verdict.

A pre-filter step screens out obvious mismatches (location, comp, tag overlap) before spending tokens on a full conversation.

## Quick start

```bash
cd izhaar-agents
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env
# edit .env, set ANTHROPIC_API_KEY=sk-ant-...
uvicorn src.main:app --reload
```

## Run an end-to-end demo

```bash
# 1. Build personas for all 5 mock candidates and 3 mock roles. ~30-60s.
curl -X POST http://localhost:8000/api/v1/seed | jq

# 2. Run a match end-to-end. Maya (c_001) vs Caldera AI founding ML role (r_001).
#    Should be a strong fit.
curl -X POST "http://localhost:8000/api/v1/match/run?candidate_id=c_001&role_id=r_001" | jq

# 3. Try a mismatch: Maya (wants founding ML) vs Helion Labs research role (r_003).
#    Either should fail the pre-filter or walk away in the conversation.
curl -X POST "http://localhost:8000/api/v1/match/run?candidate_id=c_001&role_id=r_003" | jq
```

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/`                                          | Healthcheck |
| `GET`  | `/api/v1/mock/candidates`                    | List mock candidates |
| `GET`  | `/api/v1/mock/roles`                         | List mock roles |
| `POST` | `/api/v1/persona/build/candidate/{id}`       | Build candidate persona from mock data |
| `POST` | `/api/v1/persona/build/role/{id}`            | Build role persona from mock data |
| `POST` | `/api/v1/seed`                               | Build all personas |
| `POST` | `/api/v1/match/run?candidate_id=&role_id=`   | Pre-filter → conversation → judge |
| `GET`  | `/api/v1/persona/candidate/{id}`             | Read built candidate persona |
| `GET`  | `/api/v1/persona/role/{id}`                  | Read built role persona |
| `GET`  | `/api/v1/conversation/{conversation_id}`     | Read a conversation transcript |
| `GET`  | `/api/v1/verdict/conversation/{conv_id}`     | Read a judge verdict |

## Inspecting output

- **Persona quality:** `GET /api/v1/persona/candidate/c_001` shows the full claim list with evidence tier + confidence. Look for: are claims grounded? Are gaps populated? Does the runtime `system_prompt` faithfully include all the evidence?
- **Conversation transcripts:** `GET /api/v1/conversation/{id}` returns every turn, plus per-turn `sycophancy_score` when the detector ran. Watch for: probing questions vs adjective-soup; whether walk-aways were justified.
- **Verdicts:** `GET /api/v1/verdict/conversation/{id}` returns the verdict, `surface_to_human`, plus `evidence_for_match`, `evidence_against_match`, `unresolved_concerns`, and `bias_flags`.

## Models + cost

Configured in [src/config.py](src/config.py). Defaults to Claude Sonnet 4.6 for profile/role/conversation/judge, and Claude Haiku 4.5 for the sycophancy detector. An end-to-end match (4 personas already built) typically uses ~30–60k input + ~3–6k output tokens — roughly $0.10–$0.20 with Sonnet.

Every Anthropic API call is logged at `INFO` level with token counts and cost. To see them, leave `--log-level info` on uvicorn or just watch stdout.

## Connecting to the real scraper

The interface contract is a single function:

```python
profile_builder.build_candidate_persona(candidate_id: str, scraper_output: dict) -> CandidatePersona
```

Whatever shape the upstream scraper produces, write a small adapter to map its output to a dict shaped like [`src/mock_data/candidates.py`](src/mock_data/candidates.py). The profile-builder treats the whole `scraper_output` dict as opaque context for the LLM — it does not key on specific field names — so reasonable shape variation is fine.

Same applies for roles via `role_builder.build_role_persona`.

## Layout

```
src/
  config.py             # env vars, models, thresholds
  main.py               # FastAPI app entry
  models/               # Pydantic schemas (persona, conversation, verdict)
  agents/               # profile_builder, role_builder, conversation, judge
    _client.py          # shared Anthropic client + JSON parsing + cost
  prompts/              # all system prompts as Python constants
  filters/pre_filter.py
  storage/db.py         # SQLite (single JSON column per row)
  api/routes.py
  mock_data/            # 5 candidates + 3 roles, hand-crafted

tests/                  # minimal correctness checkpoints
```

## Tests

```bash
pip install -e ".[dev]"
pytest -q
```

The test suite is intentionally small. It checks that the builders return valid Pydantic objects, that conversation termination logic identifies walk-aways and max-turns correctly, and that the judge produces parseable verdicts. The tests that exercise live LLM calls are gated on `ANTHROPIC_API_KEY` being set; they will be skipped otherwise.
