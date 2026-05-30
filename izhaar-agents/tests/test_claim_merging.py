"""Tests for the claim-merging step inside profile_builder.

The merge step is an LLM call (CLAIM_MERGE_PROMPT). These offline tests verify
that the wrapping Python code wires the input/output correctly and that the
merged Claims produced by the LLM are parsed into the new schema correctly.
The actual semantic-merge quality is a live test (gated on API key).
"""

from __future__ import annotations

import json
from unittest.mock import patch

from src.agents._client import CallResult


def _fake_claude(text: str) -> CallResult:
    return CallResult(text=text, input_tokens=200, output_tokens=300, cost_usd=0.002, model="stub")


def test_merge_produces_corroborated_claims_when_sources_agree():
    """If the LLM outputs a merged claim with two sources, the Python wrapper
    must surface corroboration_count = 2 in the returned Claim."""
    from src.agents import profile_builder
    from src.models.persona import Claim, SourceAttribution

    # Two single-source claims that say similar things.
    scraper_claim = Claim(
        claim_id="c_x_scraper_0000",
        subject_id="c_x",
        claim_text="Ships ML systems to prod weekly",
        evidence_tier="verified",
        sources=[SourceAttribution(source_type="scraper_github", source_excerpt="142 commits in 90d")],
        confidence=0.85,
        tags=["ml_infra"],
    )
    chat_claim = Claim(
        claim_id="c_x_chat_0000",
        subject_id="c_x",
        claim_text="Optimizes for shipping over research",
        evidence_tier="inferred",
        sources=[SourceAttribution(source_type="ai_chat_history", source_excerpt="Section 5: optimizes for ownership and learning")],
        confidence=0.55,
        tags=["section_5", "professional_goals"],
    )

    merged_response = json.dumps({
        "claims": [
            {
                "claim_text": "Ships ML systems to prod weekly (corroborated)",
                "evidence_tier": "verified",
                "sources": [
                    {"source_type": "scraper_github", "source_excerpt": "142 commits in 90d", "source_url": "github.com/test/x"},
                    {"source_type": "ai_chat_history", "source_excerpt": "Optimizes for ownership and shipping"},
                ],
                "confidence": 0.92,
                "tags": ["ml_infra", "professional_goals"],
                "corroboration_count": 2,
                "discrepancy_flag": None,
            }
        ]
    })

    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(merged_response)):
        merged = profile_builder._merge_claims("c_x", [scraper_claim], [chat_claim])

    assert len(merged) == 1
    m = merged[0]
    assert m.corroboration_count == 2
    assert {s.source_type for s in m.sources} == {"scraper_github", "ai_chat_history"}
    assert m.discrepancy_flag is None
    assert m.confidence >= 0.85  # corroborated verified claim cap = 0.95


def test_merge_preserves_discrepancy_flag():
    """If sources contradict, the merged claim should carry discrepancy_flag."""
    from src.agents import profile_builder
    from src.models.persona import Claim, SourceAttribution

    scraper_claim = Claim(
        claim_id="c_x_scraper_0000",
        subject_id="c_x",
        claim_text="Strong at independent, solo work",
        evidence_tier="inferred",
        sources=[SourceAttribution(source_type="scraper_github", source_excerpt="Solo-built 5 indie projects")],
        confidence=0.55,
    )
    chat_claim = Claim(
        claim_id="c_x_chat_0000",
        subject_id="c_x",
        claim_text="Prefers tight pairing and frequent check-ins",
        evidence_tier="inferred",
        sources=[SourceAttribution(source_type="ai_chat_history", source_excerpt="Section 4: dislikes async-only collaboration")],
        confidence=0.55,
    )

    merged_response = json.dumps({
        "claims": [
            {
                "claim_text": "Collaboration style is unclear — sources disagree on independence vs pairing.",
                "evidence_tier": "inferred",
                "sources": [
                    {"source_type": "scraper_github", "source_excerpt": "Solo-built 5 indie projects"},
                    {"source_type": "ai_chat_history", "source_excerpt": "Dislikes async-only collaboration"},
                ],
                "confidence": 0.40,
                "tags": ["collaboration"],
                "corroboration_count": 2,
                "discrepancy_flag": "Scraper data suggests strong independent work, chat history suggests preference for tight pairing.",
            }
        ]
    })

    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(merged_response)):
        merged = profile_builder._merge_claims("c_x", [scraper_claim], [chat_claim])

    assert len(merged) == 1
    m = merged[0]
    assert m.discrepancy_flag is not None
    assert "scraper" in m.discrepancy_flag.lower()
    assert "chat history" in m.discrepancy_flag.lower()
    assert m.confidence == 0.40


def test_merge_passes_through_unique_claims():
    """A claim that only appears in one source should be preserved as-is."""
    from src.agents import profile_builder
    from src.models.persona import Claim, SourceAttribution

    only_in_scraper = Claim(
        claim_id="c_x_scraper_0000",
        subject_id="c_x",
        claim_text="Co-authored 2 papers at ACL",
        evidence_tier="verified",
        sources=[SourceAttribution(source_type="scraper_portfolio", source_excerpt="ACL 2024, EMNLP 2023")],
        confidence=0.85,
    )
    only_in_chat = Claim(
        claim_id="c_x_chat_0000",
        subject_id="c_x",
        claim_text="Energy is highest in the evenings",
        evidence_tier="inferred",
        sources=[SourceAttribution(source_type="ai_chat_history", source_excerpt="Section 11: 9pm-2am peak energy")],
        confidence=0.45,
    )

    merged_response = json.dumps({
        "claims": [
            only_in_scraper.model_dump(mode="json"),
            only_in_chat.model_dump(mode="json"),
        ]
    })

    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(merged_response)):
        merged = profile_builder._merge_claims("c_x", [only_in_scraper], [only_in_chat])

    assert len(merged) == 2
    assert all(c.corroboration_count == 1 for c in merged)


def test_merge_skipped_when_only_one_source_present():
    """When one source has no claims, the merge LLM should NOT be called."""
    from src.agents import profile_builder

    with patch.object(profile_builder, "call_claude") as mocked:
        out = profile_builder._merge_claims("c_x", [], [])
        assert out == []
        mocked.assert_not_called()
