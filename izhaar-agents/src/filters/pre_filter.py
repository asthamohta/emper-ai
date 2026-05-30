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

# Capture an optional "$", a number (which may have decimals), and an optional
# k/m suffix. We deal with commas by stripping them from the input before
# matching, which is simpler than encoding them in the regex.
_COMP_RE = re.compile(r"\$?(\d+(?:\.\d+)?)\s*([kKmM]?)")


def _parse_comp_range(value: str) -> tuple[float, float] | None:
    """Extract a (min, max) tuple in USD from a free-form comp string.

    Handles inputs like:
      "$220-280k base, prefer equity-weighted"        → (220000, 280000)
      "$200,000–$280,000 base; 0.15%–0.60% equity"    → (200000, 280000)
      "200000-280000"                                  → (200000, 280000)
      "260-340k"                                       → (260000, 340000)

    The tricky cases are (a) comma-formatted numbers like $200,000 and (b)
    free-form strings that ALSO contain equity percentages (0.15%) which must
    NOT be confused with comp values. The heuristic: any number with a `k` or
    `m` suffix is comp; bare numbers < 1000 are skipped unless the same input
    has a `k` elsewhere (implies "first endpoint of a Nk-Mk range").
    """
    if not value:
        return None
    cleaned = value.replace(",", "").replace("–", "-").replace("—", "-")
    matches = _COMP_RE.findall(cleaned)
    if not matches:
        return None

    has_k = any(s.lower() == "k" for _, s in matches)

    nums: list[float] = []
    for num_str, suffix in matches:
        n = float(num_str)
        s = suffix.lower()
        if s == "k":
            n *= 1000
        elif s == "m":
            n *= 1_000_000
        elif n < 1000:
            # Bare small number with no suffix. If the input has a k somewhere
            # AND the number looks comp-shaped (>= 10), assume implicit k
            # (e.g. "220" in "$220-280k"). Otherwise treat as noise
            # (equity percentages, year counts, etc.) and skip.
            if has_k and n >= 10:
                n *= 1000
            else:
                continue
        nums.append(n)
    if not nums:
        return None
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
    """Cheap filter before expensive LLM conversation. Returns (passed, score).

    Only HARD constraints (explicit, parseable preferences) cause a knockout:
      - location: candidate and role both state a location, with no overlap
      - comp_band: candidate and role both state a range, with no overlap

    Tag overlap is computed as an informational score (0.0 to 1.0) but is NOT
    used as a knockout — LLM-generated tags vary in vocabulary, so any overlap
    threshold is too noisy to gate on. The conversation is the real filter.
    """
    candidate_prefs = {p.field: p.value for p in candidate.stated_preferences}
    role_prefs = {p.field: p.value for p in role.stated_preferences}

    # Location compatibility (hard knockout if both sides specified and don't overlap).
    cand_loc = candidate_prefs.get("location", "")
    role_loc = role_prefs.get("location", "")
    if cand_loc and role_loc and not location_overlap(cand_loc, role_loc):
        return False, 0.0

    # Comp compatibility (hard knockout if both sides specified and don't overlap).
    cand_comp = candidate_prefs.get("comp_band", "")
    role_comp = role_prefs.get("comp_band", "")
    if cand_comp and role_comp and not comp_overlap(cand_comp, role_comp):
        return False, 0.0

    # Tag overlap — informational only.
    candidate_tags = _candidate_tag_set(candidate)
    role_tags = _role_requirement_tag_set(role)
    if role_tags:
        overlap = len(candidate_tags & role_tags)
        score = overlap / max(len(role_tags), 1)
    else:
        score = 0.5

    return True, score
