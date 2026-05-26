"""Tests for the profile builder.

The live build_candidate_persona() requires the Anthropic API; gated on
ANTHROPIC_API_KEY. We also include offline tests that exercise the JSON
parsing + persona construction path with a mocked Claude response.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from src.agents._client import CallResult
from src.mock_data import candidates as mock_candidates
from src.models.persona import CandidatePersona
from tests.conftest import skip_if_no_key


def _fake_claude(text: str) -> CallResult:
    return CallResult(text=text, input_tokens=100, output_tokens=200, cost_usd=0.001, model="stub")


def test_build_candidate_persona_offline_constructs_valid_model():
    """With a mocked Claude response, the builder returns a valid CandidatePersona."""
    from src.agents import profile_builder

    fake_response = """
    {
      "summary": "Test summary about the candidate.",
      "claims": [
        {
          "claim_text": "Has shipped ML infra projects",
          "evidence_tier": "verified",
          "source": "github.com/test",
          "evidence_excerpt": "847 stars on vllm-quantization",
          "confidence": 0.9,
          "tags": ["ml_infra"]
        }
      ],
      "stated_preferences": [
        {"field": "comp_band", "value": "$220-280k", "source": "google_form"}
      ],
      "explicit_gaps": ["No data on team-leadership experience"]
    }
    """
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(fake_response)):
        persona = profile_builder.build_candidate_persona(
            "c_test", {"name": "Test Person", "sources": {}}
        )

    assert isinstance(persona, CandidatePersona)
    assert persona.candidate_id == "c_test"
    assert persona.name == "Test Person"
    assert len(persona.claims) == 1
    assert persona.claims[0].claim_id == "c_test_claim_0000"
    assert persona.claims[0].subject_id == "c_test"
    assert persona.claims[0].evidence_tier == "verified"
    assert persona.claims[0].confidence == 0.9
    assert persona.stated_preferences[0].value == "$220-280k"
    assert persona.explicit_gaps == ["No data on team-leadership experience"]
    # The system_prompt must be non-empty and include the candidate's name.
    assert "Test Person" in persona.system_prompt
    # And include the stated preferences.
    assert "$220-280k" in persona.system_prompt
    assert isinstance(persona.built_at, datetime)


def test_build_candidate_persona_strips_markdown_fences():
    """Claude sometimes wraps JSON in ```json fences despite instructions."""
    from src.agents import profile_builder

    fake_response = """```json
{
  "summary": "Fenced response.",
  "claims": [],
  "stated_preferences": [],
  "explicit_gaps": []
}
```"""
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(fake_response)):
        persona = profile_builder.build_candidate_persona(
            "c_test", {"name": "T", "sources": {}}
        )
    assert persona.summary == "Fenced response."


def test_stated_preferences_preserved_verbatim():
    """The builder must not paraphrase stated preferences — they go in verbatim."""
    from src.agents import profile_builder

    quirky = "$220-280k base, prefer equity-weighted at Series A"
    fake_response = (
        '{"summary":"x","claims":[],'
        '"stated_preferences":[{"field":"comp_band","value":"'
        + quirky
        + '","source":"google_form"}],'
        '"explicit_gaps":[]}'
    )
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(fake_response)):
        persona = profile_builder.build_candidate_persona("c_q", {"name": "Q"})
    assert persona.stated_preferences[0].value == quirky


@skip_if_no_key
def test_build_each_mock_candidate_live():
    """Live test: build all 5 mock candidates against the real API."""
    from src.agents import profile_builder

    for c in mock_candidates.ALL:
        persona = profile_builder.build_candidate_persona(c["candidate_id"], c)
        assert isinstance(persona, CandidatePersona)
        assert persona.candidate_id == c["candidate_id"]
        # We expect at least some claims for every candidate.
        assert len(persona.claims) > 0, f"{c['candidate_id']} produced no claims"
        # The system prompt must mention the candidate by name.
        assert c["name"].split()[0] in persona.system_prompt
