"""SQLite-backed storage for personas, conversations, and verdicts.

We use a single JSON column per row to keep the schema flexible during early
development — Pydantic does the heavy lifting on the way in and out. Migrate
to Postgres + proper columns once the schema stabilizes.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Optional

from src import config
from src.models.conversation import Conversation
from src.models.persona import CandidatePersona, RolePersona
from src.models.verdict import JudgeVerdict


_SCHEMA = """
CREATE TABLE IF NOT EXISTS candidate_personas (
    candidate_id TEXT PRIMARY KEY,
    data         TEXT NOT NULL,
    built_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_personas (
    role_id   TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    built_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id TEXT PRIMARY KEY,
    candidate_id    TEXT NOT NULL,
    role_id         TEXT NOT NULL,
    data            TEXT NOT NULL,
    started_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_pair ON conversations(candidate_id, role_id);

CREATE TABLE IF NOT EXISTS verdicts (
    verdict_id      TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL UNIQUE,
    candidate_id    TEXT NOT NULL,
    role_id         TEXT NOT NULL,
    data            TEXT NOT NULL,
    judged_at       TEXT NOT NULL
);
"""


@contextmanager
def _conn():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        conn.row_factory = sqlite3.Row
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _conn() as c:
        c.executescript(_SCHEMA)


# ---- Candidate personas -------------------------------------------------------


def save_candidate_persona(persona: CandidatePersona) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO candidate_personas (candidate_id, data, built_at) VALUES (?, ?, ?)",
            (persona.candidate_id, persona.model_dump_json(), persona.built_at.isoformat()),
        )


def get_candidate_persona(candidate_id: str) -> Optional[CandidatePersona]:
    with _conn() as c:
        row = c.execute(
            "SELECT data FROM candidate_personas WHERE candidate_id = ?",
            (candidate_id,),
        ).fetchone()
    if not row:
        return None
    return CandidatePersona.model_validate_json(row["data"])


# ---- Role personas ------------------------------------------------------------


def save_role_persona(persona: RolePersona) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO role_personas (role_id, data, built_at) VALUES (?, ?, ?)",
            (persona.role_id, persona.model_dump_json(), persona.built_at.isoformat()),
        )


def get_role_persona(role_id: str) -> Optional[RolePersona]:
    with _conn() as c:
        row = c.execute(
            "SELECT data FROM role_personas WHERE role_id = ?",
            (role_id,),
        ).fetchone()
    if not row:
        return None
    return RolePersona.model_validate_json(row["data"])


# ---- Conversations ------------------------------------------------------------


def save_conversation(conv: Conversation) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO conversations "
            "(conversation_id, candidate_id, role_id, data, started_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                conv.conversation_id,
                conv.candidate_id,
                conv.role_id,
                conv.model_dump_json(),
                conv.started_at.isoformat(),
            ),
        )


def get_conversation(conversation_id: str) -> Optional[Conversation]:
    with _conn() as c:
        row = c.execute(
            "SELECT data FROM conversations WHERE conversation_id = ?",
            (conversation_id,),
        ).fetchone()
    if not row:
        return None
    return Conversation.model_validate_json(row["data"])


# ---- Verdicts -----------------------------------------------------------------


def save_verdict(verdict: JudgeVerdict) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO verdicts "
            "(verdict_id, conversation_id, candidate_id, role_id, data, judged_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                verdict.verdict_id,
                verdict.conversation_id,
                verdict.candidate_id,
                verdict.role_id,
                verdict.model_dump_json(),
                verdict.judged_at.isoformat(),
            ),
        )


def get_verdict_for_conversation(conversation_id: str) -> Optional[JudgeVerdict]:
    with _conn() as c:
        row = c.execute(
            "SELECT data FROM verdicts WHERE conversation_id = ?",
            (conversation_id,),
        ).fetchone()
    if not row:
        return None
    return JudgeVerdict.model_validate_json(row["data"])
