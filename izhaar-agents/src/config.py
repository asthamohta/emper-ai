import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
# Note: we don't raise here. The Anthropic client constructor is responsible
# for failing loudly when a key is actually needed. Importing the package
# (e.g. for unit tests that mock out call_claude) should not require a key.

PROFILE_MODEL = "claude-haiku-4-5-20251001"
ROLE_MODEL = "claude-sonnet-4-6"
CONVERSATION_MODEL = "claude-sonnet-4-6"
JUDGE_MODEL = "claude-sonnet-4-6"
SYCOPHANCY_MODEL = "claude-haiku-4-5-20251001"

MAX_CONVERSATION_TURNS = 12
SYCOPHANCY_CHECK_EVERY_N_TURNS = 4
SYCOPHANCY_INJECTION_THRESHOLD = 0.7

MIN_SKILL_TAG_OVERLAP = 0.2

DB_PATH = os.getenv("IZHAAR_DB_PATH", "izhaar.db")

# Postgres connection string for the shared scraper DB (the Next.js side
# writes candidate_documents / jobs / company_documents into this database).
# Default matches the docker-compose service in the repo root.
SCRAPER_DATABASE_URL = os.getenv(
    "SCRAPER_DATABASE_URL",
    "postgresql://emper:emper_secret@localhost:5432/emper",
)

# Optional shared secret used by the X-Agents-Key dependency on /api/v1/*.
# When empty, the dependency is a no-op (dev mode — the standalone static
# UI works without authentication). When set, all /api/v1/* requests must
# include matching X-Agents-Key.
AGENTS_API_KEY = os.getenv("AGENTS_API_KEY", "").strip()
