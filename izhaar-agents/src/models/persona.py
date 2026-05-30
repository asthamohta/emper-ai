from __future__ import annotations

from typing import Any, Literal, Optional
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

EvidenceTier = Literal["verified", "stated", "inferred"]

# Candidate-side source types come from the spec. Role-side types are added
# here so RolePersona.claims can use the same Claim model without forking it.
SourceType = Literal[
    # Candidate scraper sources
    "scraper_resume",
    "scraper_github",
    "scraper_linkedin",
    "scraper_portfolio",
    "scraper_huggingface",
    "scraper_form",
    # Candidate self-provided
    "ai_chat_history",
    # Role-side sources
    "role_jd",
    "role_culture",
    "role_company",
    "role_team",
]


class SourceAttribution(BaseModel):
    source_type: SourceType
    source_excerpt: str
    source_url: Optional[str] = None


def _legacy_source_to_attribution(source_str: str, excerpt: str) -> dict:
    """Map a free-form legacy `source` string + `evidence_excerpt` into the
    new SourceAttribution shape. Best-effort; defaults to scraper_form."""
    s = (source_str or "").lower()
    if "github" in s:
        return {"source_type": "scraper_github", "source_excerpt": excerpt, "source_url": source_str}
    if "linkedin" in s:
        return {"source_type": "scraper_linkedin", "source_excerpt": excerpt}
    if "huggingface" in s or "hugging_face" in s or "hf.co" in s:
        return {"source_type": "scraper_huggingface", "source_excerpt": excerpt}
    if "portfolio" in s or "blog" in s or "publications" in s or ".dev" in s:
        return {"source_type": "scraper_portfolio", "source_excerpt": excerpt}
    if "google_form" in s or "form" in s or "questionnaire" in s:
        return {"source_type": "scraper_form", "source_excerpt": excerpt}
    if "resume" in s or "/cv" in s:
        return {"source_type": "scraper_resume", "source_excerpt": excerpt}
    if "chat" in s or "ai_chat" in s:
        return {"source_type": "ai_chat_history", "source_excerpt": excerpt}
    if "jd" in s or "job description" in s:
        return {"source_type": "role_jd", "source_excerpt": excerpt}
    if "culture" in s:
        return {"source_type": "role_culture", "source_excerpt": excerpt}
    if "company" in s or "founder" in s or "website" in s:
        return {"source_type": "role_company", "source_excerpt": excerpt}
    # Default catch-all.
    return {"source_type": "scraper_form", "source_excerpt": excerpt or source_str}


class Claim(BaseModel):
    claim_id: str
    subject_id: str
    claim_text: str
    evidence_tier: EvidenceTier
    sources: list[SourceAttribution]
    confidence: float = Field(ge=0.0, le=1.0)
    tags: list[str] = []
    corroboration_count: int = 1
    discrepancy_flag: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy_shape(cls, data: Any) -> Any:
        """Convert the legacy single-source claim shape (with `source` and
        `evidence_excerpt` at the top level) into the new multi-source shape.

        This keeps the user's existing SQLite-stored personas readable after
        the schema change. New claims always come in with `sources` already.
        """
        if not isinstance(data, dict):
            return data
        if "sources" in data and data["sources"]:
            return data
        legacy_source = data.pop("source", None)
        legacy_excerpt = data.pop("evidence_excerpt", "")
        if legacy_source is not None or legacy_excerpt:
            data["sources"] = [_legacy_source_to_attribution(legacy_source or "", legacy_excerpt or "")]
        data.setdefault("corroboration_count", len(data.get("sources", [])) or 1)
        return data


class StatedPreference(BaseModel):
    field: str
    value: str
    source: str


class CandidatePersona(BaseModel):
    candidate_id: str
    name: str
    summary: str
    claims: list[Claim]
    stated_preferences: list[StatedPreference]
    explicit_gaps: list[str]
    system_prompt: str
    built_at: datetime


class RolePersona(BaseModel):
    role_id: str
    company_name: str
    role_title: str
    summary: str
    claims: list[Claim]
    stated_preferences: list[StatedPreference]
    anti_fit_criteria: list[str]
    system_prompt: str
    built_at: datetime
