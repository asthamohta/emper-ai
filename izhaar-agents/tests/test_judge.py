"""Tests for the judge agent."""

from __future__ import annotations

from unittest.mock import patch

from src.agents._client import CallResult
from src.models.verdict import JudgeVerdict


def _fake_claude(text: str) -> CallResult:
    return CallResult(text=text, input_tokens=500, output_tokens=300, cost_usd=0.005, model="stub")


def test_judge_parses_verdict_and_constructs_model(sample_conversation, maya_persona, caldera_role):
    """Judge should parse JSON and return a valid JudgeVerdict."""
    from src.agents import judge

    fake = """
    {
      "match_verdict": "no_match",
      "confidence": 0.85,
      "reasoning": "Candidate walked away because the role is research-focused but the candidate wants to ship.",
      "evidence_for_match": [],
      "evidence_against_match": ["Candidate stated they want shipping-heavy work"],
      "unresolved_concerns": [],
      "surface_to_human": false,
      "bias_flags": []
    }
    """
    with patch.object(judge, "call_claude", return_value=_fake_claude(fake)):
        verdict = judge.judge_conversation(sample_conversation, maya_persona, caldera_role)

    assert isinstance(verdict, JudgeVerdict)
    assert verdict.match_verdict == "no_match"
    assert verdict.confidence == 0.85
    assert verdict.surface_to_human is False
    assert verdict.conversation_id == sample_conversation.conversation_id
    assert "research-focused" in verdict.reasoning


def test_judge_forces_surface_false_for_marginal_verdict(
    sample_conversation, maya_persona, caldera_role
):
    """Even if the model says surface_to_human=true on a marginal verdict, override."""
    from src.agents import judge

    fake = """
    {
      "match_verdict": "marginal",
      "confidence": 0.5,
      "reasoning": "Some signal but significant gaps.",
      "evidence_for_match": ["X"],
      "evidence_against_match": ["Y"],
      "unresolved_concerns": ["Z"],
      "surface_to_human": true,
      "bias_flags": []
    }
    """
    with patch.object(judge, "call_claude", return_value=_fake_claude(fake)):
        verdict = judge.judge_conversation(sample_conversation, maya_persona, caldera_role)
    assert verdict.match_verdict == "marginal"
    assert verdict.surface_to_human is False, "marginal must not surface to a human"


def test_judge_strips_markdown_fences(sample_conversation, maya_persona, caldera_role):
    from src.agents import judge

    fake = """```json
{
  "match_verdict": "strong",
  "confidence": 0.92,
  "reasoning": "All signals aligned.",
  "evidence_for_match": ["a", "b"],
  "evidence_against_match": [],
  "unresolved_concerns": [],
  "surface_to_human": true,
  "bias_flags": ["Worth auditing whether the conversation was too easy"]
}
```"""
    with patch.object(judge, "call_claude", return_value=_fake_claude(fake)):
        verdict = judge.judge_conversation(sample_conversation, maya_persona, caldera_role)
    assert verdict.match_verdict == "strong"
    assert verdict.surface_to_human is True
    assert len(verdict.bias_flags) == 1


def test_judge_bias_flags_populated(sample_conversation, maya_persona, caldera_role):
    from src.agents import judge

    fake = """
    {
      "match_verdict": "good",
      "confidence": 0.78,
      "reasoning": "Real fit with one cultural concern.",
      "evidence_for_match": ["strong infra background"],
      "evidence_against_match": ["never worked at a sub-30-person team"],
      "unresolved_concerns": ["on-call appetite not probed"],
      "surface_to_human": true,
      "bias_flags": ["Conversation did not probe on-call willingness"]
    }
    """
    with patch.object(judge, "call_claude", return_value=_fake_claude(fake)):
        verdict = judge.judge_conversation(sample_conversation, maya_persona, caldera_role)
    assert verdict.bias_flags == ["Conversation did not probe on-call willingness"]
    assert verdict.match_verdict == "good"
    assert verdict.surface_to_human is True
