"""Tests for the pre-filter — pure logic, no LLM."""

from __future__ import annotations

from src.filters.pre_filter import (
    _parse_comp_range,
    comp_overlap,
    location_overlap,
    pre_filter,
)


def test_location_overlap_sf_synonyms():
    assert location_overlap("Bay Area, open to NYC", "SF in-office") is True
    assert location_overlap("San Francisco", "Bay Area") is True


def test_location_overlap_no_match():
    assert location_overlap("Berlin only", "NYC only") is False
    assert location_overlap("NYC", "Bay Area (SF, in-office)") is False


def test_location_remote_overlap():
    assert location_overlap("Berlin, remote", "Remote US-only") is True


def test_location_missing_data_is_permissive():
    assert location_overlap("", "SF") is True
    assert location_overlap("Berlin", "") is True


def test_comp_overlap_basic():
    assert comp_overlap("$220-280k", "200000-280000") is True
    assert comp_overlap("$200-260k base", "260000-340000") is True  # edge touch
    assert comp_overlap("$280-360k", "180000-240000") is False


def test_comp_parse_range_handles_k_suffix():
    assert _parse_comp_range("$220-280k") == (220_000, 280_000)
    assert _parse_comp_range("260-340k base + equity") == (260_000, 340_000)


def test_comp_overlap_missing_data_is_permissive():
    assert comp_overlap("", "$200k") is True
    assert comp_overlap("$200k", "") is True


def test_pre_filter_hard_knockout_on_comp(maya_persona, caldera_role):
    """A candidate whose comp range is way above the role's should be filtered out."""
    high_comp_maya = maya_persona.model_copy(
        update={
            "stated_preferences": [
                p.model_copy(update={"value": "$500-600k base"}) if p.field == "comp_band" else p
                for p in maya_persona.stated_preferences
            ]
        }
    )
    passed, score = pre_filter(high_comp_maya, caldera_role)
    assert passed is False
    assert score == 0.0


def test_pre_filter_passes_good_pair(maya_persona, caldera_role):
    """Maya vs Caldera should pass — overlapping comp, overlapping location, overlapping tags."""
    passed, score = pre_filter(maya_persona, caldera_role)
    assert passed is True
    assert score > 0.0
