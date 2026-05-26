from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

MatchVerdict = Literal["strong", "good", "marginal", "no_match"]


class JudgeVerdict(BaseModel):
    verdict_id: str
    conversation_id: str
    candidate_id: str
    role_id: str
    match_verdict: MatchVerdict
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    evidence_for_match: list[str]
    evidence_against_match: list[str]
    unresolved_concerns: list[str]
    surface_to_human: bool
    bias_flags: list[str]
    judged_at: datetime
