"""Tests for the conversation orchestrator.

Most behavior is covered by offline tests of the termination / walk-away /
message-construction helpers. A single live test exercises a known-bad-fit
pair end-to-end and asserts that someone walks away.
"""

from __future__ import annotations

from datetime import datetime, timezone

from src.agents.conversation import (
    WALK_AWAY_PHRASES,
    _all_express_agreement,
    _build_messages_for_speaker,
    _check_termination,
    _check_walk_away,
    _next_speaker,
)
from src.models.conversation import Turn


def _t(turn_number: int, speaker, content: str) -> Turn:
    return Turn(
        turn_number=turn_number,
        speaker=speaker,
        content=content,
        timestamp=datetime.now(timezone.utc),
    )


def test_walk_away_phrases_are_detected_case_insensitively():
    assert _check_walk_away("Based on this, I don't think this is the right fit.")
    assert _check_walk_away("DON'T THINK THIS WOULD BE A GOOD FIT")
    assert _check_walk_away("I'll pass on this opportunity, thanks.")
    assert not _check_walk_away("Tell me more about the on-call setup.")


def test_walk_away_phrase_list_is_nonempty():
    assert len(WALK_AWAY_PHRASES) >= 5


def test_check_termination_identifies_candidate_walk_away():
    transcript = [
        _t(1, "role", "Tell us about your work."),
        _t(2, "candidate", "I don't think this is the right fit because the role is research-focused."),
    ]
    reason, walked_by, walk_reason = _check_termination(transcript, max_turns=12)
    assert reason == "candidate_walked_away"
    assert walked_by == "candidate"
    assert walk_reason and "research-focused" in walk_reason


def test_check_termination_identifies_role_walk_away():
    transcript = [
        _t(1, "role", "Tell us about you."),
        _t(2, "candidate", "I want X."),
        _t(3, "role", "Based on that, I don't think this would be a good fit."),
    ]
    reason, walked_by, _ = _check_termination(transcript, max_turns=12)
    assert reason == "role_walked_away"
    assert walked_by == "role"


def test_check_termination_returns_none_on_active_conversation():
    transcript = [
        _t(1, "role", "What's your favorite project?"),
        _t(2, "candidate", "vllm-quantization — what's your bottleneck right now?"),
    ]
    reason, _, _ = _check_termination(transcript, max_turns=12)
    assert reason is None


def test_check_termination_enforces_max_turns():
    transcript = [_t(i, "role" if i % 2 else "candidate", f"Turn {i}") for i in range(1, 13)]
    reason, _, _ = _check_termination(transcript, max_turns=12)
    assert reason == "max_turns"


def test_next_speaker_alternates_from_role():
    # Turn 1 = role opener. Turn 2 = candidate. Turn 3 = role. ...
    assert _next_speaker(1) == "role"
    assert _next_speaker(2) == "candidate"
    assert _next_speaker(3) == "role"
    assert _next_speaker(4) == "candidate"


def test_build_messages_for_speaker_maps_roles_correctly():
    transcript = [
        _t(1, "role", "Hi, here's what we're looking for."),
        _t(2, "candidate", "Got it — tell me about the comp band."),
    ]
    # If the next speaker is "role", the role's turn 1 should appear as 'assistant'.
    msgs = _build_messages_for_speaker(transcript, "role")
    assert msgs[0]["role"] == "user"  # because the API needs a user-first message
    # The role's own turn was the very first one in the transcript and was at
    # position 0 (assistant from role's POV). The function will then have
    # inserted a synthetic "Please begin." user message ahead of it.
    assert msgs[0]["content"] == "Please begin."
    assert msgs[1]["role"] == "assistant"
    assert "what we're looking for" in msgs[1]["content"]
    assert msgs[2]["role"] == "user"
    assert "comp band" in msgs[2]["content"]


def test_build_messages_for_candidate_speaker():
    transcript = [
        _t(1, "role", "What's your background?"),
        _t(2, "candidate", "ML infra — Stripe, then Foundry."),
        _t(3, "role", "What did you ship at Foundry?"),
    ]
    msgs = _build_messages_for_speaker(transcript, "candidate")
    # From candidate POV: role's first turn = user, candidate's own turn = assistant, role's next = user.
    assert msgs[0]["role"] == "user"
    assert "background" in msgs[0]["content"]
    assert msgs[1]["role"] == "assistant"
    assert "Foundry" in msgs[1]["content"]
    assert msgs[2]["role"] == "user"


def test_all_express_agreement_detects_sycophantic_run():
    sycophantic = [
        _t(10, "role", "I agree. That makes total sense."),
        _t(11, "candidate", "Absolutely. I think so too."),
        _t(12, "role", "Definitely. Sounds great."),
    ]
    assert _all_express_agreement(sycophantic) is True


def test_all_express_agreement_false_when_questions_present():
    not_sycophantic = [
        _t(10, "role", "Agree on the comp. What about location?"),
        _t(11, "candidate", "I'm in the Bay Area."),
        _t(12, "role", "Great — when could you start?"),
    ]
    assert _all_express_agreement(not_sycophantic) is False
