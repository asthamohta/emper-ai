"""Job 1: Candidate profile-builder (multi-source).

Input shape (per the multi-source spec):

    {
      "candidate_id": "c_001",
      "name": "Maya Chen",                 # optional, top-level helper
      "sources": {
        "scraper": {
          "resume": {...}, "github": {...}, "linkedin": {...},
          "portfolio": {...}, "huggingface": {...}, "google_form": {...}
        },
        "ai_chat_history": {
          "provider": "claude",
          "submitted_at": "ISO timestamp",
          "raw_output": "the 13-section text the candidate pasted in"
        }
      }
    }

Either branch of `sources` may be absent. The builder produces:

    scraper-only       → no chat-history claims; a gap entry is added
    chat-history-only  → no verified scraper claims; a gap entry is added
    both               → two-pass extraction + LLM-driven merge, with
                          corroboration_count and discrepancy_flag set
                          per the spec's rules.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from src import config
from src.agents._client import BatchRequest, call_claude, call_claude_batch, parse_json_strict
from src.models.persona import (
    CandidatePersona,
    Claim,
    SourceAttribution,
    StatedPreference,
)
from src.prompts.ai_chat_history_prompt import AI_CHAT_HISTORY_EXTRACTION_PROMPT
from src.prompts.candidate_persona_prompt import build_candidate_persona_system_prompt
from src.prompts.claim_merge_prompt import CLAIM_MERGE_PROMPT
from src.prompts.profile_builder_prompt import PROFILE_BUILDER_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


# ----- Helpers ---------------------------------------------------------------


def _claim_from_parsed(
    candidate_id: str,
    index: int,
    parsed: dict,
    *,
    id_prefix: str,
    default_source_type: str = "scraper_form",
) -> Claim:
    """Construct a Claim from one LLM-emitted claim dict.

    Accepts either the new shape (`source_type` + `source_excerpt` + optional
    `source_url`) or a `sources` array if the LLM emitted one directly.
    """
    if "sources" in parsed and parsed["sources"]:
        sources = [SourceAttribution.model_validate(s) for s in parsed["sources"]]
    else:
        source_type = parsed.get("source_type") or default_source_type
        source_excerpt = parsed.get("source_excerpt") or parsed.get("evidence_excerpt") or ""
        source_url = parsed.get("source_url")
        sources = [
            SourceAttribution(
                source_type=source_type,  # type: ignore[arg-type] — Literal validated by Pydantic
                source_excerpt=source_excerpt,
                source_url=source_url,
            )
        ]

    return Claim(
        claim_id=f"{candidate_id}_{id_prefix}_{index:04d}",
        subject_id=candidate_id,
        claim_text=parsed["claim_text"],
        evidence_tier=parsed["evidence_tier"],
        sources=sources,
        confidence=float(parsed["confidence"]),
        tags=list(parsed.get("tags", [])),
        corroboration_count=int(parsed.get("corroboration_count", len(sources))),
        discrepancy_flag=parsed.get("discrepancy_flag"),
    )


# ----- Pass 1: scraper extraction --------------------------------------------


def _build_scraper_request(candidate_id: str, scraper_data: dict) -> BatchRequest:
    user_message = (
        "Build a grounded candidate persona from the following SCRAPED data. "
        "Follow the schema and rules in the system prompt exactly.\n\n"
        f"SCRAPER DATA:\n{json.dumps(scraper_data, indent=2)}"
    )
    return BatchRequest(
        custom_id=f"scraper-{candidate_id}",
        system=PROFILE_BUILDER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.PROFILE_MODEL,
        max_tokens=8192,
        temperature=0.3,
    )


def _parse_scraper_result(
    candidate_id: str, result_text: str
) -> tuple[list[Claim], list[StatedPreference], list[str], str]:
    parsed = parse_json_strict(result_text, context=f"profile_builder:scraper:{candidate_id}")
    claims = [
        _claim_from_parsed(candidate_id, i, c, id_prefix="scraper")
        for i, c in enumerate(parsed.get("claims", []))
    ]
    prefs = [
        StatedPreference(field=p["field"], value=p["value"], source=p["source"])
        for p in parsed.get("stated_preferences", [])
    ]
    return claims, prefs, list(parsed.get("explicit_gaps", [])), parsed.get("summary", "")


# ----- Pass 2: chat-history extraction ---------------------------------------


def _build_chat_request(candidate_id: str, chat_history: dict) -> BatchRequest | None:
    raw = chat_history.get("raw_output", "")
    if not raw.strip():
        logger.info("chat_history.raw_output is empty for %s — skipping pass 2", candidate_id)
        return None
    provider = chat_history.get("provider", "unknown")
    submitted = chat_history.get("submitted_at", "")
    user_message = (
        f"AI assistant: {provider}\n"
        f"Submitted at: {submitted}\n\n"
        "Below is the 13-section behavioral profile the candidate pasted in. "
        "Extract claims per the rules in the system prompt. Strip any "
        "identifying information that leaked through.\n\n"
        "----- BEGIN PASTED PROFILE -----\n"
        f"{raw}\n"
        "----- END PASTED PROFILE -----"
    )
    return BatchRequest(
        custom_id=f"chat-{candidate_id}",
        system=AI_CHAT_HISTORY_EXTRACTION_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.PROFILE_MODEL,
        max_tokens=8192,
        temperature=0.3,
    )


def _parse_chat_result(candidate_id: str, result_text: str) -> tuple[list[Claim], str]:
    parsed = parse_json_strict(result_text, context=f"profile_builder:chat:{candidate_id}")
    claims: list[Claim] = []
    for i, c in enumerate(parsed.get("claims", [])):
        c.setdefault("source_type", "ai_chat_history")
        claims.append(_claim_from_parsed(candidate_id, i, c, id_prefix="chat"))
    return claims, parsed.get("summary", "")


# ----- Pass 3: merge ----------------------------------------------------------


def _merge_claims(
    candidate_id: str,
    scraper_claims: list[Claim],
    chat_history_claims: list[Claim],
) -> list[Claim]:
    """LLM-driven merge of two claim sets. Identifies agreement, disagreement,
    and unique claims, returning a single merged list."""
    if not scraper_claims and not chat_history_claims:
        return []
    if not scraper_claims:
        return chat_history_claims
    if not chat_history_claims:
        return scraper_claims

    payload = {
        "scraper_claims": [c.model_dump(mode="json") for c in scraper_claims],
        "chat_history_claims": [c.model_dump(mode="json") for c in chat_history_claims],
    }
    user_message = (
        "Merge the following two sets of claims about the same candidate, "
        "following the rules in the system prompt.\n\n"
        f"{json.dumps(payload, indent=2)}"
    )
    result = call_claude(
        system=CLAIM_MERGE_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        model=config.PROFILE_MODEL,
        max_tokens=8192,
        temperature=0.2,
        label=f"profile_builder:merge:{candidate_id}",
    )
    parsed = parse_json_strict(result.text, context=f"profile_builder:merge:{candidate_id}")

    merged: list[Claim] = []
    for i, c in enumerate(parsed.get("claims", [])):
        merged.append(_claim_from_parsed(candidate_id, i, c, id_prefix="merged"))
    return merged


# ----- Public entry point ----------------------------------------------------


def build_candidate_persona(candidate_id: str, input_dict: dict) -> CandidatePersona:
    """Build a grounded persona for a candidate from multi-source input.

    See module docstring for the expected input shape.
    """
    name = input_dict.get("name", "Unknown Candidate")
    sources_in = input_dict.get("sources", {}) or {}

    scraper_claims: list[Claim] = []
    chat_history_claims: list[Claim] = []
    stated_prefs: list[StatedPreference] = []
    scraper_gaps: list[str] = []
    scraper_summary = ""
    chat_summary = ""

    scraper_data = sources_in.get("scraper") if isinstance(sources_in, dict) else None
    chat_data = sources_in.get("ai_chat_history") if isinstance(sources_in, dict) else None

    # Build batch requests for whichever sources are present (passes 1 & 2 are independent).
    batch_requests: list[BatchRequest] = []
    if scraper_data:
        batch_requests.append(_build_scraper_request(candidate_id, scraper_data))
    chat_req = _build_chat_request(candidate_id, chat_data) if chat_data else None
    if chat_req:
        batch_requests.append(chat_req)

    batch_results = call_claude_batch(
        batch_requests,
        label=f"profile_builder:{candidate_id}",
    )

    if scraper_data and f"scraper-{candidate_id}" in batch_results:
        scraper_claims, stated_prefs, scraper_gaps, scraper_summary = _parse_scraper_result(
            candidate_id, batch_results[f"scraper-{candidate_id}"].text
        )
    if chat_req and f"chat-{candidate_id}" in batch_results:
        chat_history_claims, chat_summary = _parse_chat_result(
            candidate_id, batch_results[f"chat-{candidate_id}"].text
        )

    # Merge or pass through.
    if scraper_claims and chat_history_claims:
        merged_claims = _merge_claims(candidate_id, scraper_claims, chat_history_claims)
    else:
        merged_claims = scraper_claims + chat_history_claims

    # Source presence gaps — surface in the persona so future matchers know
    # which signal is missing.
    explicit_gaps = list(scraper_gaps)
    if not chat_data:
        explicit_gaps.append(
            "AI chat history not yet provided — behavioral claims absent. "
            "Candidate can paste this in via the dashboard prompt."
        )
    if not scraper_data:
        explicit_gaps.append(
            "Scraped data (resume, GitHub, LinkedIn, portfolio) not yet linked — "
            "verifiable claims absent."
        )

    # Final summary.
    summary = scraper_summary or chat_summary or (
        f"{name}: persona built but no signal yet — connect sources to populate."
    )

    persona = CandidatePersona(
        candidate_id=candidate_id,
        name=name,
        summary=summary,
        claims=merged_claims,
        stated_preferences=stated_prefs,
        explicit_gaps=explicit_gaps,
        system_prompt="",
        built_at=datetime.now(timezone.utc),
    )
    runtime_prompt = build_candidate_persona_system_prompt(persona)
    return persona.model_copy(update={"system_prompt": runtime_prompt})
