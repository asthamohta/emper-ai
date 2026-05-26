"""Cheap, LLM-free pre-filter to avoid expensive conversations on obvious mismatches.

The filter returns (passed, score). A `False` first element is a hard knockout;
a `True` first element means the conversation orchestrator should proceed.

These heuristics are intentionally simple. They will be wrong sometimes — that's
fine; the conversation layer is the real signal. The job here is to keep cost
in check, not to be correct in every edge case.
"""

from __future__ import annotations

import re

from src import config
from src.models.persona import CandidatePersona, RolePersona

# ---- Location matching --------------------------------------------------------

_REMOTE_TOKENS = {"remote", "anywhere", "global", "worldwide"}


def _normalize_location_tokens(value: str) -> set[str]:
    """Reduce a free-form location string to a set of comparable tokens."""
    if not value:
        return set()
    low = value.lower()
    tokens: set[str] = set()

    # Common city/region heuristics
    city_synonyms = {
        "sf": {"sf", "san francisco", "bay area"},
        "bay area": {"sf", "san francisco", "bay area"},
        "san francisco": {"sf", "san francisco", "bay area"},
        "nyc": {"nyc", "new york", "new york city"},
        "new york": {"nyc", "new york", "new york city"},
        "berlin": {"berlin"},
        "pittsburgh": {"pittsburgh"},
        "us": {"us", "united states", "usa"},
    }

    for key, syns in city_synonyms.items():
        if key in low:
            tokens |= syns

    if "remote" in low or any(r in low for r in _REMOTE_TOKENS):
        tokens.add("remote")

    # Always include the raw lowercased value in case nothing else matched.
    if not tokens:
        tokens.add(low.strip())

    return tokens


def location_overlap(candidate_loc: str, role_loc: str) -> bool:
    """True if there is any plausible geographic overlap between the two strings."""
    cand_tokens = _normalize_location_tokens(candidate_loc)
    role_tokens = _normalize_location_tokens(role_loc)

    if not cand_tokens or not role_tokens:
        # Missing data shouldn't be a hard knockout — let the conversation surface it.
        return True

    # Remote candidate + role allows remote => match
    if "remote" in cand_tokens and "remote" in role_tokens:
        return True

    return bool(cand_tokens & role_tokens)


# ---- Comp band matching -------------------------------------------------------

_COMP_RE = re.compile(r"(\d+(?:\.\d+)?)\s*k?", re.IGNORECASE)


def _parse_comp_range(value: str) -> tuple[float, float] | None:
    """Extract a (min, max) tuple in USD from a free-form comp string.

    Handles strings like:
      "$220-280k base, prefer equity-weighted"
      "200000-280000"
      "260-340k"
    """
    if not value:
        return None
    matches = _COMP_RE.findall(value)
    if not matches:
        return None

    # Convert to floats. Treat any number under 1000 as "in thousands".
    nums: list[float] = []
    for m in matches:
        n = float(m)
        if n < 1000:
            n *= 1000
        nums.append(n)
    if not nums:
        return None

    # Use the first two numbers as the range; if only one, treat as both endpoints.
    if len(nums) == 1:
        return (nums[0], nums[0])
    return (min(nums[0], nums[1]), max(nums[0], nums[1]))


def comp_overlap(candidate_comp: str, role_comp: str) -> bool:
    """True if the two comp ranges overlap (or if either is unparseable)."""
    c = _parse_comp_range(candidate_comp)
    r = _parse_comp_range(role_comp)
    if c is None or r is None:
        return True
    return not (c[1] < r[0] or r[1] < c[0])


# ---- Tag overlap --------------------------------------------------------------


def _candidate_tag_set(candidate: CandidatePersona) -> set[str]:
    tags: set[str] = set()
    for claim in candidate.claims:
        tags.update(t.lower() for t in claim.tags)
    return tags


def _role_requirement_tag_set(role: RolePersona) -> set[str]:
    """Tags from claims marked hard_requirement or soft_requirement."""
    tags: set[str] = set()
    for claim in role.claims:
        if any(t in ("hard_requirement", "soft_requirement") for t in claim.tags):
            # Include all tags on these requirement claims (besides the requirement marker itself).
            for t in claim.tags:
                if t not in ("hard_requirement", "soft_requirement"):
                    tags.add(t.lower())
    # Fall back to all role tags if the role builder didn't tag requirements explicitly.
    if not tags:
        for claim in role.claims:
            tags.update(t.lower() for t in claim.tags if t != "context")
    return tags


# ---- Main filter --------------------------------------------------------------


def pre_filter(candidate: CandidatePersona, role: RolePersona) -> tuple[bool, float]:
    """Cheap filter before expensive LLM conversation. Returns (passed, score)."""
    candidate_prefs = {p.field: p.value for p in candidate.stated_preferences}
    role_prefs = {p.field: p.value for p in role.stated_preferences}

    # Location compatibility
    cand_loc = candidate_prefs.get("location", "")
    role_loc = role_prefs.get("location", "")
    if cand_loc and role_loc and not location_overlap(cand_loc, role_loc):
        return False, 0.0

    # Comp compatibility
    cand_comp = candidate_prefs.get("comp_band", "")
    role_comp = role_prefs.get("comp_band", "")
    if cand_comp and role_comp and not comp_overlap(cand_comp, role_comp):
        return False, 0.0

    # Tag overlap on requirements
    candidate_tags = _candidate_tag_set(candidate)
    role_tags = _role_requirement_tag_set(role)

    if not role_tags:
        # If we can't compute, default to passing the filter — the conversation
        # is the better signal anyway.
        return True, 0.5

    overlap = len(candidate_tags & role_tags)
    score = overlap / max(len(role_tags), 1)

    if score < config.MIN_SKILL_TAG_OVERLAP:
        return False, score

    return True, score
