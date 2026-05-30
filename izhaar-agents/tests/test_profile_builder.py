"""Tests for the multi-source profile builder.

The builder is now a 2-pass + merge flow:
  scraper extraction → chat history extraction → LLM merge.

Offline tests mock out the underlying call_claude() so we don't burn tokens.
The live test exercises the real Anthropic API and is gated on the API key.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

from src.agents._client import CallResult
from src.mock_data import candidates as mock_candidates
from src.models.persona import CandidatePersona
from tests.conftest import skip_if_no_key


def _fake_claude(text: str) -> CallResult:
    return CallResult(text=text, input_tokens=100, output_tokens=200, cost_usd=0.001, model="stub")


# ---------- scraper-only path -------------------------------------------------


SCRAPER_ONLY_RESPONSE = """
{
  "summary": "Test summary about the candidate.",
  "claims": [
    {
      "claim_text": "Has shipped ML infra projects",
      "evidence_tier": "verified",
      "source_type": "scraper_github",
      "source_excerpt": "847 stars on vllm-quantization",
      "source_url": "github.com/mayachen/vllm-quantization",
      "confidence": 0.85,
      "tags": ["ml_infra", "cuda"]
    }
  ],
  "stated_preferences": [
    {"field": "comp_band", "value": "$220-280k", "source": "google_form"}
  ],
  "explicit_gaps": ["No data on team-leadership experience"]
}
"""


def test_scraper_only_input_succeeds():
    """If only `sources.scraper` is provided, build a persona from that alone
    and surface a gap noting the chat history is missing."""
    from src.agents import profile_builder

    input_dict = {
        "candidate_id": "c_test",
        "name": "Test Person",
        "sources": {"scraper": {"github": {"username": "t"}}},
    }
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(SCRAPER_ONLY_RESPONSE)):
        persona = profile_builder.build_candidate_persona("c_test", input_dict)

    assert isinstance(persona, CandidatePersona)
    assert persona.candidate_id == "c_test"
    assert persona.name == "Test Person"
    assert len(persona.claims) == 1
    c = persona.claims[0]
    assert c.evidence_tier == "verified"
    assert len(c.sources) == 1
    assert c.sources[0].source_type == "scraper_github"
    assert c.sources[0].source_url == "github.com/mayachen/vllm-quantization"
    assert c.corroboration_count == 1
    assert c.discrepancy_flag is None

    # Missing-source gap surfaced.
    assert any("chat history" in g.lower() for g in persona.explicit_gaps)

    # System prompt baked in.
    assert "Test Person" in persona.system_prompt
    assert "scraper_github" in persona.system_prompt  # source attribution visible


def test_scraper_only_strips_markdown_fences():
    from src.agents import profile_builder

    fenced = "```json\n" + SCRAPER_ONLY_RESPONSE + "\n```"
    input_dict = {
        "candidate_id": "c_t",
        "name": "T",
        "sources": {"scraper": {"github": {"username": "t"}}},
    }
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(fenced)):
        persona = profile_builder.build_candidate_persona("c_t", input_dict)
    assert persona.summary == "Test summary about the candidate."


def test_stated_preferences_preserved_verbatim():
    """The builder must not paraphrase stated preferences — they go in verbatim."""
    from src.agents import profile_builder

    quirky = "$220-280k base, prefer equity-weighted at Series A"
    fake = (
        '{"summary":"x","claims":[],'
        '"stated_preferences":[{"field":"comp_band","value":"'
        + quirky
        + '","source":"google_form"}],'
        '"explicit_gaps":[]}'
    )
    input_dict = {"candidate_id": "c_q", "name": "Q", "sources": {"scraper": {"google_form": {}}}}
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(fake)):
        persona = profile_builder.build_candidate_persona("c_q", input_dict)
    assert persona.stated_preferences[0].value == quirky


# ---------- chat-history-only path -------------------------------------------


CHAT_HISTORY_RESPONSE = """
{
  "summary": "Direct, evidence-first communicator who optimizes for ownership.",
  "claims": [
    {
      "claim_text": "Prefers small teams; discomfort scaling beyond ~5 collaborators on the same code path",
      "evidence_tier": "inferred",
      "source_excerpt": "Section 4: explicit statement about losing context past ~5 engineers",
      "confidence": 0.55,
      "tags": ["section_4", "collaboration"]
    },
    {
      "claim_text": "Decision-making is anchored in measurable evidence and A/B comparisons",
      "evidence_tier": "inferred",
      "source_excerpt": "Section 2: runs measurable comparisons before committing",
      "confidence": 0.65,
      "tags": ["section_2", "decision_making"]
    }
  ]
}
"""


def test_chat_history_only_input_succeeds():
    """If only `sources.ai_chat_history` is provided, build claims from that
    alone and surface a gap noting scraper data is missing."""
    from src.agents import profile_builder

    input_dict = {
        "candidate_id": "c_chat",
        "name": "Chat Only Person",
        "sources": {
            "ai_chat_history": {
                "provider": "claude",
                "submitted_at": "2026-05-20T14:32:00Z",
                "raw_output": "Section 4: Prefers small teams...",
            }
        },
    }
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(CHAT_HISTORY_RESPONSE)):
        persona = profile_builder.build_candidate_persona("c_chat", input_dict)

    assert len(persona.claims) == 2
    for claim in persona.claims:
        assert claim.evidence_tier == "inferred"
        assert claim.sources[0].source_type == "ai_chat_history"
        assert claim.corroboration_count == 1
        assert claim.discrepancy_flag is None
    assert any("scraped data" in g.lower() or "scraper" in g.lower() for g in persona.explicit_gaps)


# ---------- both sources → merge path ----------------------------------------


MERGE_RESPONSE = """
{
  "claims": [
    {
      "claim_text": "Has shipped ML infra projects (corroborated by both scraped GitHub work and self-described working pattern)",
      "evidence_tier": "verified",
      "sources": [
        {"source_type": "scraper_github", "source_excerpt": "847 stars on vllm-quantization", "source_url": "github.com/mayachen/vllm-quantization"},
        {"source_type": "ai_chat_history", "source_excerpt": "Section 6: technical interests cite inference infrastructure"}
      ],
      "confidence": 0.92,
      "tags": ["ml_infra", "cuda"],
      "corroboration_count": 2,
      "discrepancy_flag": null
    },
    {
      "claim_text": "Prefers small teams",
      "evidence_tier": "inferred",
      "sources": [
        {"source_type": "ai_chat_history", "source_excerpt": "Section 4 — discomfort past ~5 engineers"}
      ],
      "confidence": 0.55,
      "tags": ["section_4", "collaboration"],
      "corroboration_count": 1,
      "discrepancy_flag": null
    }
  ]
}
"""


def test_both_sources_merges_and_corroborates():
    """When both sources are present, builder calls scraper extraction, then
    chat-history extraction, then a merge LLM call. Corroborated claims should
    have corroboration_count >= 2."""
    from src.agents import profile_builder

    input_dict = {
        "candidate_id": "c_both",
        "name": "Both Sources",
        "sources": {
            "scraper": {"github": {"username": "t"}},
            "ai_chat_history": {
                "provider": "claude",
                "submitted_at": "2026-05-20T14:32:00Z",
                "raw_output": "Section 4: small teams.",
            },
        },
    }

    call_sequence = iter([
        _fake_claude(SCRAPER_ONLY_RESPONSE),     # pass 1
        _fake_claude(CHAT_HISTORY_RESPONSE),      # pass 2
        _fake_claude(MERGE_RESPONSE),             # pass 3 (merge)
    ])

    def fake_call(**kwargs):
        return next(call_sequence)

    with patch.object(profile_builder, "call_claude", side_effect=fake_call):
        persona = profile_builder.build_candidate_persona("c_both", input_dict)

    assert len(persona.claims) == 2
    corroborated = [c for c in persona.claims if c.corroboration_count == 2]
    assert len(corroborated) == 1
    assert {s.source_type for s in corroborated[0].sources} == {
        "scraper_github",
        "ai_chat_history",
    }

    # No "chat history not yet provided" gap when chat history IS provided.
    assert not any("chat history not yet" in g.lower() for g in persona.explicit_gaps)


# ---------- live ----------


@skip_if_no_key
def test_build_each_mock_candidate_live():
    """Live test: build all 5 mock candidates against the real API."""
    from src.agents import profile_builder

    for c in mock_candidates.ALL:
        persona = profile_builder.build_candidate_persona(c["candidate_id"], c)
        assert isinstance(persona, CandidatePersona)
        assert persona.candidate_id == c["candidate_id"]
        assert len(persona.claims) > 0, f"{c['candidate_id']} produced no claims"
        first_name = c["name"].split()[0]
        assert first_name in persona.system_prompt
