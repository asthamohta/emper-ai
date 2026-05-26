import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
# Note: we don't raise here. The Anthropic client constructor is responsible
# for failing loudly when a key is actually needed. Importing the package
# (e.g. for unit tests that mock out call_claude) should not require a key.

PROFILE_MODEL = "claude-sonnet-4-6"
ROLE_MODEL = "claude-sonnet-4-6"
CONVERSATION_MODEL = "claude-sonnet-4-6"
JUDGE_MODEL = "claude-sonnet-4-6"
SYCOPHANCY_MODEL = "claude-haiku-4-5-20251001"

MAX_CONVERSATION_TURNS = 12
SYCOPHANCY_CHECK_EVERY_N_TURNS = 4
SYCOPHANCY_INJECTION_THRESHOLD = 0.7

MIN_SKILL_TAG_OVERLAP = 0.2

DB_PATH = os.getenv("IZHAAR_DB_PATH", "izhaar.db")
