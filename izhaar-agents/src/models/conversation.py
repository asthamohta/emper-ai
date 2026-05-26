from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

Speaker = Literal["candidate", "role"]
TerminationReason = Literal[
    "candidate_walked_away",
    "role_walked_away",
    "convergence_yes",
    "convergence_no",
    "max_turns",
    "stuck_agreement",
]


class Turn(BaseModel):
    turn_number: int
    speaker: Speaker
    content: str
    timestamp: datetime
    sycophancy_score: Optional[float] = None
    internal_reasoning: Optional[str] = None


class Conversation(BaseModel):
    conversation_id: str
    candidate_id: str
    role_id: str
    transcript: list[Turn]
    termination_reason: TerminationReason
    walked_away_by: Optional[Speaker] = None
    walk_reason: Optional[str] = None
    turn_count: int
    cost_usd: float
    started_at: datetime
    ended_at: datetime
