"""Job 2: Role/company persona builder.

Symmetric to profile_builder. Takes role + company data and returns a
RolePersona with its runtime system prompt baked in.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from src import config
from src.agents._client import call_claude, parse_json_strict
from src.models.persona import Claim, RolePersona, SourceAttribution, StatedPreference
from src.prompts.role_builder_prompt import ROLE_BUILDER_SYSTEM_PROMPT
from src.prompts.role_persona_prompt import build_role_persona_system_prompt


def _map_role_source(source_str: str) -> str:
    s = (source_str or "").lower()
    if "jd" in s or "job description" in s or "description" in s:
        return "role_jd"
    if "culture" in s:
        return "role_culture"
    if "team" in s or "founder" in s or "team_lead" in s:
        return "role_team"
    if "company" in s or "website" in s or "mission" in s:
        return "role_company"
    return "role_jd"  # safe default


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
        # The role-builder prompt still emits a single `source` + `evidence_excerpt`
        # per claim. Wrap that into the new SourceAttribution list shape.
        source_str = c.get("source", "")
        attribution = SourceAttribution(
            source_type=_map_role_source(source_str),  # type: ignore[arg-type]
            source_excerpt=c.get("evidence_excerpt", ""),
            source_url=source_str if source_str.startswith("http") else None,
        )
        claims.append(
            Claim(
                claim_id=f"{role_id}_claim_{i:04d}",
                subject_id=role_id,
                claim_text=c["claim_text"],
                evidence_tier=c["evidence_tier"],
                sources=[attribution],
                confidence=float(c["confidence"]),
                tags=list(c.get("tags", [])),
                corroboration_count=1,
                discrepancy_flag=None,
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
