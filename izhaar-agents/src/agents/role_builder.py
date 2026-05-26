"""Job 2: Role/company persona builder.

Symmetric to profile_builder. Takes role + company data and returns a
RolePersona with its runtime system prompt baked in.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from src import config
from src.agents._client import call_claude, parse_json_strict
from src.models.persona import Claim, RolePersona, StatedPreference
from src.prompts.role_builder_prompt import ROLE_BUILDER_SYSTEM_PROMPT
from src.prompts.role_persona_prompt import build_role_persona_system_prompt


def build_role_persona(role_id: str, role_data: dict) -> RolePersona:
    """Build a grounded role persona from role + company data."""

    company_name = role_data.get("company", {}).get("name", "Unknown Company")
    role_title = role_data.get("role", {}).get("title", "Unknown Role")

    user_message = (
        "Build a grounded role persona from the following role + company data. "
        "Follow the schema and rules in the system prompt exactly.\n\n"
        f"ROLE DATA:\n{json.dumps(role_data, indent=2)}"
    )

    result = call_claude(
        system=ROLE_BUILDER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.ROLE_MODEL,
        max_tokens=4096,
        temperature=0.3,
        label=f"role_builder:{role_id}",
    )

    parsed = parse_json_strict(result.text, context=f"role_builder:{role_id}")

    claims: list[Claim] = []
    for i, c in enumerate(parsed.get("claims", [])):
        claims.append(
            Claim(
                claim_id=f"{role_id}_claim_{i:04d}",
                subject_id=role_id,
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

    anti_fit = list(parsed.get("anti_fit_criteria", []))

    persona_for_prompt = RolePersona(
        role_id=role_id,
        company_name=company_name,
        role_title=role_title,
        summary=parsed["summary"],
        claims=claims,
        stated_preferences=stated_prefs,
        anti_fit_criteria=anti_fit,
        system_prompt="",
        built_at=datetime.now(timezone.utc),
    )
    runtime_prompt = build_role_persona_system_prompt(persona_for_prompt)

    return persona_for_prompt.model_copy(update={"system_prompt": runtime_prompt})
