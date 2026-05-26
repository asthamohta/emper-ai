from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

EvidenceTier = Literal["verified", "stated", "inferred"]


class Claim(BaseModel):
    claim_id: str
    subject_id: str
    claim_text: str
    evidence_tier: EvidenceTier
    source: str
    evidence_excerpt: str
    confidence: float = Field(ge=0.0, le=1.0)
    tags: list[str] = []


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
