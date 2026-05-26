"""Shared pytest fixtures."""

from __future__ import annotations

import os
from datetime import datetime, timezone

import pytest

from src.models.conversation import Conversation, Turn
from src.models.persona import CandidatePersona, Claim, RolePersona, StatedPreference

LIVE = os.getenv("ANTHROPIC_API_KEY", "").startswith("sk-")

skip_if_no_key = pytest.mark.skipif(
    not LIVE,
    reason="Live LLM tests require ANTHROPIC_API_KEY to be set.",
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@pytest.fixture
def maya_persona() -> CandidatePersona:
    return CandidatePersona(
        candidate_id="c_001",
        name="Maya Chen",
        summary="ML engineer with strong inference-systems track record.",
        claims=[
            Claim(
                claim_id="c_001_claim_0000",
                subject_id="c_001",
                claim_text="Has shipped CUDA-level optimizations for LLM inference",
                evidence_tier="verified",
                source="github.com/mayachen/vllm-quantization",
                evidence_excerpt="847 stars; 142 commits in last 90 days",
                confidence=0.9,
                tags=["ml_infra", "cuda", "inference"],
            ),
            Claim(
                claim_id="c_001_claim_0001",
                subject_id="c_001",
                claim_text="Prior production experience at scale (Stripe payments ML)",
                evidence_tier="stated",
                source="linkedin",
                evidence_excerpt="Shipped a real-time fraud scoring service handling 30k QPS",
                confidence=0.7,
                tags=["production", "ml"],
            ),
        ],
        stated_preferences=[
            StatedPreference(field="comp_band", value="$220-280k base", source="google_form"),
            StatedPreference(field="location", value="Bay Area, open to NYC", source="google_form"),
            StatedPreference(
                field="role_type",
                value="Founding ML eng or early eng at AI-first startup",
                source="google_form",
            ),
        ],
        explicit_gaps=["Has not worked at a sub-30-person startup"],
        system_prompt="(stub system prompt)",
        built_at=_now(),
    )


@pytest.fixture
def caldera_role() -> RolePersona:
    return RolePersona(
        role_id="r_001",
        company_name="Caldera AI",
        role_title="Founding ML Engineer",
        summary="Owns the inference + quantization stack end-to-end.",
        claims=[
            Claim(
                claim_id="r_001_claim_0000",
                subject_id="r_001",
                claim_text="3+ years ML infrastructure experience required",
                evidence_tier="stated",
                source="JD",
                evidence_excerpt="3+ years ML infrastructure experience",
                confidence=0.95,
                tags=["hard_requirement", "ml_infra"],
            ),
            Claim(
                claim_id="r_001_claim_0001",
                subject_id="r_001",
                claim_text="Comfortable with CUDA or willing to learn fast",
                evidence_tier="stated",
                source="JD",
                evidence_excerpt="Comfortable with CUDA or willing to learn fast",
                confidence=0.9,
                tags=["soft_requirement", "cuda"],
            ),
        ],
        stated_preferences=[
            StatedPreference(field="comp_band", value="$200-280k base", source="JD"),
            StatedPreference(field="location", value="Bay Area (SF, in-office)", source="JD"),
        ],
        anti_fit_criteria=["Wants pure research role"],
        system_prompt="(stub system prompt)",
        built_at=_now(),
    )


@pytest.fixture
def sample_conversation() -> Conversation:
    """Two-turn conversation that ends with a candidate walk-away."""
    return Conversation(
        conversation_id="conv_sample",
        candidate_id="c_001",
        role_id="r_999",
        transcript=[
            Turn(
                turn_number=1,
                speaker="role",
                content="We're looking for a researcher to publish papers on alignment.",
                timestamp=_now(),
            ),
            Turn(
                turn_number=2,
                speaker="candidate",
                content=(
                    "Based on what I've heard, I don't think this is the right fit "
                    "because I want a shipping-heavy role, not a publication-focused one."
                ),
                timestamp=_now(),
            ),
        ],
        termination_reason="candidate_walked_away",
        walked_away_by="candidate",
        walk_reason="Wants shipping, not publishing.",
        turn_count=2,
        cost_usd=0.012,
        started_at=_now(),
        ended_at=_now(),
    )
