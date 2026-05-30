"""Pydantic request models for the stateless build endpoints.

These are the wire formats Next.js sends. The shapes mirror what the existing
profile_builder / role_builder code already consumes — see
izhaar-agents/src/agents/profile_builder.py module docstring and
izhaar-agents/src/mock_data/roles.py for the canonical reference.

Forward-compatibility: every nested model sets `extra=allow` so new fields
that the TS side adds (e.g. a new scraper source) flow through to the LLM
without a Python-side schema change.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


# ─── Candidate input ──────────────────────────────────────────────────────────


class ChatHistoryInput(BaseModel):
    """The pasted-in AI-generated behavioral profile."""

    model_config = ConfigDict(extra="allow")

    provider: Literal["claude", "chatgpt", "gemini", "grok"]
    submitted_at: str
    raw_output: str


class ScraperInput(BaseModel):
    """Scraped sources for the candidate. Each is optional; the LLM only
    sees what's present. Additional source keys (e.g. ``twitter``) are
    accepted via ``extra=allow`` so the TS side can extend without a
    Python schema change."""

    model_config = ConfigDict(extra="allow")

    resume: Optional[dict] = None
    github: Optional[dict] = None
    linkedin: Optional[dict] = None
    portfolio: Optional[dict] = None
    website: Optional[dict] = None
    huggingface: Optional[dict] = None
    google_form: Optional[dict] = None


class CandidateSources(BaseModel):
    """Wraps the two top-level branches the profile_builder consumes."""

    model_config = ConfigDict(extra="allow")

    scraper: Optional[ScraperInput] = None
    ai_chat_history: Optional[ChatHistoryInput] = None


class BuildCandidateRequest(BaseModel):
    """POST /api/v1/build/candidate-from-payload body."""

    model_config = ConfigDict(extra="allow")

    candidate_id: str
    name: Optional[str] = None
    sources: CandidateSources


# ─── Role input ───────────────────────────────────────────────────────────────


class CompanyInput(BaseModel):
    """Company block. Open shape so the LLM gets every field the caller wants."""

    model_config = ConfigDict(extra="allow")

    name: str


class RoleInfoInput(BaseModel):
    """Role block. Open shape — title is the only required field."""

    model_config = ConfigDict(extra="allow")

    title: str


class BuildRoleRequest(BaseModel):
    """POST /api/v1/build/role-from-payload body."""

    model_config = ConfigDict(extra="allow")

    role_id: str
    company: CompanyInput
    role: RoleInfoInput


# ─── Match input ──────────────────────────────────────────────────────────────


class RunMatchRequest(BaseModel):
    """POST /api/v1/match/run-from-payload body.

    Stateless — Next.js sends both persona objects in full; Python computes
    pre-filter + conversation + verdict; returns all three. No DB touched.
    """

    model_config = ConfigDict(extra="allow")

    # Loose typing — these are deserialized into our Pydantic models inside the
    # handler. Accepting `dict` here avoids fighting Pydantic over the nested
    # SourceAttribution / StatedPreference Literal types when they come back
    # over the wire.
    candidate_persona: dict
    role_persona: dict
