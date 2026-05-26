"""Job 1: Candidate profile-builder.

Takes scraper output (a dict) and returns a fully-constructed CandidatePersona,
including the runtime system prompt that will be used during conversations.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from src import config
from src.agents._client import call_claude, parse_json_strict
from src.models.persona import (
    CandidatePersona,
    Claim,
    StatedPreference,
)
from src.prompts.candidate_persona_prompt import build_candidate_persona_system_prompt
from src.prompts.profile_builder_prompt import PROFILE_BUILDER_SYSTEM_PROMPT


def build_candidate_persona(candidate_id: str, scraper_output: dict) -> CandidatePersona:
    """Build a grounded persona for a candidate from scraper output."""

    name = scraper_output.get("name", "Unknown Candidate")

    user_message = (
        "Build a grounded candidate persona from the following scraper output. "
        "Follow the schema and rules in the system prompt exactly.\n\n"
        f"SCRAPER OUTPUT:\n{json.dumps(scraper_output, indent=2)}"
    )

    result = call_claude(
        system=PROFILE_BUILDER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.PROFILE_MODEL,
        max_tokens=4096,
        temperature=0.3,
        label=f"profile_builder:{candidate_id}",
    )

    parsed = parse_json_strict(result.text, context=f"profile_builder:{candidate_id}")

    claims: list[Claim] = []
    for i, c in enumerate(parsed.get("claims", [])):
        claims.append(
            Claim(
                claim_id=f"{candidate_id}_claim_{i:04d}",
                subject_id=candidate_id,
                claim_text=c["claim_text"],
                evidence_tier=c["evidence_tier"],
                source=c["source"],
                evidence_excerpt=c["evidence_excerpt"],
                confidence=float(c["confidence"]),
                tags=list(c.get("tags", [])),
            )
        )

    stated_prefs = [
        StatedPreference(field=p["field"], value=p["value"], source=p["source"])
        for p in parsed.get("stated_preferences", [])
    ]

    explicit_gaps = list(parsed.get("explicit_gaps", []))

    # Build the persona WITHOUT system_prompt first so we can pass it to the builder.
    persona_for_prompt = CandidatePersona(
        candidate_id=candidate_id,
        name=name,
        summary=parsed["summary"],
        claims=claims,
        stated_preferences=stated_prefs,
        explicit_gaps=explicit_gaps,
        system_prompt="",  # placeholder
        built_at=datetime.now(timezone.utc),
    )
    runtime_prompt = build_candidate_persona_system_prompt(persona_for_prompt)

    return persona_for_prompt.model_copy(update={"system_prompt": runtime_prompt})
