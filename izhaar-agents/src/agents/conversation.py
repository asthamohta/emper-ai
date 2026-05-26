"""Job 3: Adversarial conversation orchestrator.

Drives an alternating-turn conversation between a candidate persona and a role
persona. Each persona sees its own utterances as the assistant role and the
other persona's utterances as the user role. The role persona opens.

Anti-sycophancy mechanisms:
  - Every 3rd turn (after turn 3) the next speaker gets an injected reminder
    to ask at least one specific, probing question.
  - Every 4th turn we run a Haiku-based sycophancy detector. If it scores the
    last 4 turns above SYCOPHANCY_INJECTION_THRESHOLD, the next speaker also
    gets a suggested concern to raise.

Termination conditions (checked after every turn):
  - Either persona uses an explicit walk-away phrase.
  - Last 3 turns show pure mutual agreement with no new information.
  - max_turns reached.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from src import config
from src.agents._client import call_claude, parse_json_strict
from src.models.conversation import Conversation, Speaker, TerminationReason, Turn
from src.models.persona import CandidatePersona, RolePersona
from src.prompts.sycophancy_detector_prompt import SYCOPHANCY_DETECTOR_PROMPT

logger = logging.getLogger(__name__)


WALK_AWAY_PHRASES = (
    "don't think this is the right fit",
    "not the right fit",
    "wouldn't be a good fit",
    "would not be a good fit",
    "don't think this would work",
    "don't think this would be a good fit",
    "going to walk away",
    "decline this opportunity",
    "i'll pass on this",
    "going to pass on this",
)


# ----- Helpers ----------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _next_speaker(turn_number: int) -> Speaker:
    """Role opens (turn 1). After that, alternate: even = candidate, odd = role."""
    return "candidate" if turn_number % 2 == 0 else "role"


def _build_messages_for_speaker(transcript: list[Turn], speaker: Speaker) -> list[dict]:
    """Map the transcript to the API's message list from the given speaker's POV.

    The speaker's own past utterances become `assistant` messages; the other
    persona's utterances become `user` messages. We also collapse consecutive
    user turns (shouldn't happen, but defensive) into a single message.
    """
    messages: list[dict] = []
    for turn in transcript:
        role = "assistant" if turn.speaker == speaker else "user"
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += "\n\n" + turn.content
        else:
            messages.append({"role": role, "content": turn.content})

    # The API requires the message list to begin with a user-role message.
    # If the first turn was from the same speaker we're calling for (shouldn't
    # happen, since the role opens and the candidate goes second), inject a
    # synthetic "Please continue." nudge.
    if not messages or messages[0]["role"] != "user":
        messages.insert(0, {"role": "user", "content": "Please begin."})

    # Same constraint: the list must end with a user-role message before we
    # ask the assistant for a response.
    if messages[-1]["role"] != "user":
        messages.append({"role": "user", "content": "Please respond."})

    return messages


def _check_walk_away(content: str) -> bool:
    low = content.lower()
    return any(p in low for p in WALK_AWAY_PHRASES)


def _all_express_agreement(turns: list[Turn]) -> bool:
    """Cheap heuristic: every turn is short, contains no question mark, and
    contains a soft-agreement word. This is intentionally conservative — the
    sycophancy detector is the better signal; this is just for very obvious
    stuck-in-agreement loops."""
    agreement_tokens = (
        "agree",
        "absolutely",
        "exactly",
        "definitely",
        "totally",
        "makes sense",
        "sounds great",
        "i think so too",
    )
    for t in turns:
        c = t.content.lower()
        if "?" in c:
            return False
        if not any(token in c for token in agreement_tokens):
            return False
    return True


def _check_termination(
    transcript: list[Turn],
    max_turns: int,
) -> tuple[Optional[TerminationReason], Optional[Speaker], Optional[str]]:
    """Return (reason, walked_away_by, walk_reason) or (None, None, None)."""
    if not transcript:
        return None, None, None

    last = transcript[-1]

    if _check_walk_away(last.content):
        reason: TerminationReason = (
            "candidate_walked_away" if last.speaker == "candidate" else "role_walked_away"
        )
        return reason, last.speaker, last.content

    if len(transcript) >= 6 and _all_express_agreement(transcript[-3:]):
        return "stuck_agreement", None, None

    if len(transcript) >= max_turns:
        return "max_turns", None, None

    return None, None, None


# ----- Sycophancy detector ----------------------------------------------------


def _run_sycophancy_detector(last_turns: list[Turn]) -> dict:
    transcript_text = "\n\n".join(
        f"[{t.turn_number} {t.speaker}]: {t.content}" for t in last_turns
    )
    result = call_claude(
        system=SYCOPHANCY_DETECTOR_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Last {len(last_turns)} turns:\n\n{transcript_text}",
            }
        ],
        model=config.SYCOPHANCY_MODEL,
        max_tokens=512,
        temperature=0.2,
        label="sycophancy_detector",
    )
    try:
        return parse_json_strict(result.text, context="sycophancy_detector") | {
            "_cost_usd": result.cost_usd
        }
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("sycophancy detector failed to parse: %s", exc)
        return {"sycophancy_score": 0.0, "reasoning": "parse_failed", "suggested_injection": None, "_cost_usd": result.cost_usd}


# ----- Main orchestrator ------------------------------------------------------


def run_conversation(
    candidate_persona: CandidatePersona,
    role_persona: RolePersona,
    max_turns: int = config.MAX_CONVERSATION_TURNS,
) -> Conversation:
    """Drive an adversarial conversation between the two personas to termination."""

    started_at = _now()
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    transcript: list[Turn] = []
    total_cost = 0.0

    # ----- Turn 1: role opens. ------------------------------------------------
    opener = call_claude(
        system=role_persona.system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    "Open the conversation. Briefly describe what you're looking for "
                    "in 2-3 sentences, then ask the candidate one specific opening "
                    "question."
                ),
            }
        ],
        model=config.CONVERSATION_MODEL,
        max_tokens=600,
        temperature=0.7,
        label=f"role_opener:{conversation_id}",
    )
    total_cost += opener.cost_usd
    transcript.append(
        Turn(
            turn_number=1,
            speaker="role",
            content=opener.text,
            timestamp=_now(),
        )
    )

    pending_injection: Optional[str] = None

    # ----- Alternating turns until termination. -------------------------------
    for turn_num in range(2, max_turns + 1):
        speaker = _next_speaker(turn_num)
        system_prompt = (
            candidate_persona.system_prompt if speaker == "candidate" else role_persona.system_prompt
        )
        messages = _build_messages_for_speaker(transcript, speaker)

        # Anti-sycophancy reminder every 3rd turn after turn 3.
        reminders: list[str] = []
        if turn_num > 3 and turn_num % 3 == 0:
            reminders.append(
                "[INTERNAL REMINDER] Before responding, ask yourself: have you "
                "asked at least one specific, probing question that could surface "
                "a real concern? If not, do so now. Stay grounded in your evidence."
            )
        if pending_injection:
            reminders.append(f"[INTERNAL REMINDER] {pending_injection}")
            pending_injection = None

        if reminders:
            # Append to the last user message rather than adding a new one — the
            # API requires alternating roles, and inserting another user msg
            # would break that constraint after we already ensured the list
            # ends with a user message.
            messages[-1] = {
                "role": "user",
                "content": messages[-1]["content"] + "\n\n" + "\n".join(reminders),
            }

        resp = call_claude(
            system=system_prompt,
            messages=messages,
            model=config.CONVERSATION_MODEL,
            max_tokens=600,
            temperature=0.7,
            label=f"turn_{turn_num}_{speaker}:{conversation_id}",
        )
        total_cost += resp.cost_usd
        transcript.append(
            Turn(
                turn_number=turn_num,
                speaker=speaker,
                content=resp.text,
                timestamp=_now(),
            )
        )

        # Check termination.
        reason, walked_by, walk_reason = _check_termination(transcript, max_turns)
        if reason is not None:
            return Conversation(
                conversation_id=conversation_id,
                candidate_id=candidate_persona.candidate_id,
                role_id=role_persona.role_id,
                transcript=transcript,
                termination_reason=reason,
                walked_away_by=walked_by,
                walk_reason=walk_reason,
                turn_count=len(transcript),
                cost_usd=total_cost,
                started_at=started_at,
                ended_at=_now(),
            )

        # Run sycophancy detector every 4th turn.
        if turn_num >= 4 and turn_num % config.SYCOPHANCY_CHECK_EVERY_N_TURNS == 0:
            sample = transcript[-4:]
            detector = _run_sycophancy_detector(sample)
            total_cost += detector.get("_cost_usd", 0.0)
            score = float(detector.get("sycophancy_score", 0.0) or 0.0)
            # Annotate the most recent turn with the score.
            transcript[-1] = transcript[-1].model_copy(update={"sycophancy_score": score})
            if score > config.SYCOPHANCY_INJECTION_THRESHOLD:
                suggested = detector.get("suggested_injection")
                if suggested:
                    pending_injection = (
                        f"The conversation is drifting into easy agreement. "
                        f"Raise this specific concern in your next turn: {suggested}"
                    )
                else:
                    pending_injection = (
                        "The conversation is drifting into easy agreement. In your "
                        "next turn, surface a specific, evidence-grounded concern "
                        "you have not yet raised."
                    )

    # If we exit the loop without returning, max_turns was hit and termination
    # check above already returned. Defensive fallback:
    return Conversation(
        conversation_id=conversation_id,
        candidate_id=candidate_persona.candidate_id,
        role_id=role_persona.role_id,
        transcript=transcript,
        termination_reason="max_turns",
        walked_away_by=None,
        walk_reason=None,
        turn_count=len(transcript),
        cost_usd=total_cost,
        started_at=started_at,
        ended_at=_now(),
    )
