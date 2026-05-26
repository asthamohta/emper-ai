"""Job 4: Independent judge.

Reads the full transcript + the underlying evidence bases for both personas
(non-negotiable per PRD — the judge does NOT see only the transcript) and
returns a verdict.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from src import config
from src.agents._client import call_claude, parse_json_strict
from src.models.conversation import Conversation
from src.models.persona import CandidatePersona, RolePersona
from src.models.verdict import JudgeVerdict
from src.prompts.judge_prompt import JUDGE_SYSTEM_PROMPT


def _format_transcript(conversation: Conversation) -> str:
    lines = []
    for t in conversation.transcript:
        label = "CANDIDATE" if t.speaker == "candidate" else "ROLE"
        lines.append(f"[Turn {t.turn_number} | {label}]\n{t.content}")
    return "\n\n".join(lines)


def _format_candidate_evidence(persona: CandidatePersona) -> str:
    claims_text = "\n".join(
        f"- [{c.evidence_tier.upper()} conf={c.confidence:.2f}] {c.claim_text} "
        f"(source: {c.source}; excerpt: {c.evidence_excerpt})"
        for c in persona.claims
    )
    prefs_text = "\n".join(
        f"- {p.field}: {p.value} (source: {p.source})" for p in persona.stated_preferences
    )
    gaps_text = "\n".join(f"- {g}" for g in persona.explicit_gaps) or "(none listed)"
    return (
        f"CANDIDATE: {persona.name} ({persona.candidate_id})\n"
        f"Summary: {persona.summary}\n\n"
        f"Claims:\n{claims_text}\n\n"
        f"Stated preferences:\n{prefs_text}\n\n"
        f"Known gaps:\n{gaps_text}"
    )


def _format_role_evidence(persona: RolePersona) -> str:
    claims_text = "\n".join(
        f"- [{c.evidence_tier.upper()} conf={c.confidence:.2f} tags={c.tags}] {c.claim_text} "
        f"(source: {c.source}; excerpt: {c.evidence_excerpt})"
        for c in persona.claims
    )
    prefs_text = "\n".join(
        f"- {p.field}: {p.value} (source: {p.source})" for p in persona.stated_preferences
    )
    anti_fit_text = "\n".join(f"- {a}" for a in persona.anti_fit_criteria) or "(none listed)"
    return (
        f"ROLE: {persona.role_title} at {persona.company_name} ({persona.role_id})\n"
        f"Summary: {persona.summary}\n\n"
        f"Requirements:\n{claims_text}\n\n"
        f"Stated preferences:\n{prefs_text}\n\n"
        f"Anti-fit criteria:\n{anti_fit_text}"
    )


def judge_conversation(
    conversation: Conversation,
    candidate_persona: CandidatePersona,
    role_persona: RolePersona,
) -> JudgeVerdict:
    """Score a conversation against the underlying evidence."""

    user_message = (
        "Evaluate the following conversation against the underlying evidence "
        "for both the candidate and the role. Follow the rules and output "
        "schema in the system prompt exactly.\n\n"
        f"TERMINATION REASON: {conversation.termination_reason}\n"
        f"WALKED AWAY BY: {conversation.walked_away_by or '(none)'}\n"
        f"TURN COUNT: {conversation.turn_count}\n\n"
        f"--- CANDIDATE EVIDENCE BASE ---\n{_format_candidate_evidence(candidate_persona)}\n\n"
        f"--- ROLE EVIDENCE BASE ---\n{_format_role_evidence(role_persona)}\n\n"
        f"--- CONVERSATION TRANSCRIPT ---\n{_format_transcript(conversation)}"
    )

    result = call_claude(
        system=JUDGE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.JUDGE_MODEL,
        max_tokens=2048,
        temperature=0.2,
        label=f"judge:{conversation.conversation_id}",
    )

    parsed = parse_json_strict(result.text, context=f"judge:{conversation.conversation_id}")

    verdict_id = f"verdict_{uuid.uuid4().hex[:12]}"
    surface_to_human = bool(parsed.get("surface_to_human", False))

    # Cross-check: the prompt says strong/good => true, marginal/no_match => false.
    # Trust the model but force consistency if it contradicted itself.
    match_verdict = parsed["match_verdict"]
    if match_verdict in ("marginal", "no_match"):
        surface_to_human = False
    elif match_verdict in ("strong", "good"):
        # Allow the model to override only by going lower — never higher.
        surface_to_human = surface_to_human or True

    return JudgeVerdict(
        verdict_id=verdict_id,
        conversation_id=conversation.conversation_id,
        candidate_id=conversation.candidate_id,
        role_id=conversation.role_id,
        match_verdict=match_verdict,
        confidence=float(parsed.get("confidence", 0.5)),
        reasoning=parsed.get("reasoning", ""),
        evidence_for_match=list(parsed.get("evidence_for_match", [])),
        evidence_against_match=list(parsed.get("evidence_against_match", [])),
        unresolved_concerns=list(parsed.get("unresolved_concerns", [])),
        surface_to_human=surface_to_human,
        bias_flags=list(parsed.get("bias_flags", [])),
        judged_at=datetime.now(timezone.utc),
    )
