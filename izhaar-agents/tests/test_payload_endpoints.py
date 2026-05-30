"""Tests for the stateless build-from-payload endpoints (Part 4b).

These endpoints are the Next.js integration path — Python is a pure
function: takes the full multi-source dict (for candidates) or role +
company dict (for roles), returns the persona JSON, never touches a DB.
"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from src.agents._client import CallResult
from src.main import app


def _fake_claude(text: str) -> CallResult:
    return CallResult(text=text, input_tokens=100, output_tokens=200, cost_usd=0.001, model="stub")


# ─── /build/candidate-from-payload ────────────────────────────────────────────


_CANDIDATE_RESPONSE = """
{
  "summary": "Test ML engineer summary.",
  "claims": [
    {
      "claim_text": "Ships ML infra projects to prod",
      "evidence_tier": "verified",
      "source_type": "scraper_github",
      "source_excerpt": "vllm-quantization, 847 stars",
      "source_url": "github.com/m/vllm-quantization",
      "confidence": 0.9,
      "tags": ["ml_infra", "cuda"]
    }
  ],
  "stated_preferences": [
    {"field": "comp_band", "value": "$220-280k", "source": "google_form"}
  ],
  "explicit_gaps": []
}
"""


def test_candidate_from_payload_with_scraper_only():
    from src.agents import profile_builder

    payload = {
        "candidate_id": "c_test_001",
        "name": "Test Person",
        "sources": {
            "scraper": {"github": {"username": "test", "top_repos": []}},
        },
    }

    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(_CANDIDATE_RESPONSE)):
        client = TestClient(app)
        r = client.post("/api/v1/build/candidate-from-payload", json=payload)

    assert r.status_code == 200, r.text
    persona = r.json()
    assert persona["candidate_id"] == "c_test_001"
    assert persona["name"] == "Test Person"
    assert len(persona["claims"]) == 1
    assert persona["claims"][0]["sources"][0]["source_type"] == "scraper_github"
    # Chat-history gap surfaced because that source was absent.
    assert any("chat history" in g.lower() for g in persona["explicit_gaps"])


def test_candidate_from_payload_with_both_sources_calls_merge():
    """When both scraper and ai_chat_history are present, the builder fires
    THREE Claude calls: scraper extraction, chat-history extraction, merge."""
    from src.agents import profile_builder

    call_sequence = iter([
        _fake_claude(_CANDIDATE_RESPONSE),                  # pass 1: scraper
        _fake_claude('{"summary":"chat","claims":[]}'),     # pass 2: chat history
        _fake_claude('{"claims":[]}'),                      # pass 3: merge
    ])

    payload = {
        "candidate_id": "c_test_002",
        "name": "Maya",
        "sources": {
            "scraper": {"github": {"username": "m"}},
            "ai_chat_history": {
                "provider": "claude",
                "submitted_at": "2026-05-28T10:00:00Z",
                "raw_output": "Section 1: focused work...",
            },
        },
    }

    with patch.object(profile_builder, "call_claude", side_effect=lambda **kw: next(call_sequence)):
        client = TestClient(app)
        r = client.post("/api/v1/build/candidate-from-payload", json=payload)

    assert r.status_code == 200, r.text


def test_candidate_from_payload_validates_provider_enum():
    """provider must be one of {claude, chatgpt, gemini, grok}."""
    payload = {
        "candidate_id": "c_x",
        "sources": {
            "ai_chat_history": {
                "provider": "made_up_ai",     # invalid
                "submitted_at": "2026-05-28T00:00:00Z",
                "raw_output": "..." * 10,
            }
        },
    }
    client = TestClient(app)
    r = client.post("/api/v1/build/candidate-from-payload", json=payload)
    assert r.status_code == 422
    assert "provider" in r.text


def test_candidate_from_payload_accepts_unknown_scraper_fields():
    """ScraperInput has extra=allow — future fields flow through to the LLM."""
    from src.agents import profile_builder

    payload = {
        "candidate_id": "c_test_003",
        "name": "Future Person",
        "sources": {
            "scraper": {
                "github": {"username": "x"},
                "twitter": {"handle": "@x"},          # not in the explicit schema
                "stackoverflow": {"reputation": 12345},  # also not in schema
            },
        },
    }
    with patch.object(profile_builder, "call_claude", return_value=_fake_claude(_CANDIDATE_RESPONSE)):
        client = TestClient(app)
        r = client.post("/api/v1/build/candidate-from-payload", json=payload)
    assert r.status_code == 200, r.text


def test_candidate_from_payload_requires_candidate_id():
    payload = {
        "name": "No ID",
        "sources": {"scraper": {"github": {"username": "x"}}},
    }
    client = TestClient(app)
    r = client.post("/api/v1/build/candidate-from-payload", json=payload)
    assert r.status_code == 422
    assert "candidate_id" in r.text


# ─── /build/role-from-payload ─────────────────────────────────────────────────


_ROLE_RESPONSE = """
{
  "summary": "Test role summary.",
  "claims": [
    {
      "claim_text": "Requires 3+ years ML infra",
      "evidence_tier": "stated",
      "source": "JD hard_requirements",
      "evidence_excerpt": "3+ years",
      "confidence": 0.9,
      "tags": ["hard_requirement", "ml_infra"]
    }
  ],
  "stated_preferences": [
    {"field": "location", "value": "SF", "source": "JD"}
  ],
  "anti_fit_criteria": ["Wants pure research role"]
}
"""


def test_role_from_payload_succeeds():
    from src.agents import role_builder

    payload = {
        "role_id": "r_test_001",
        "company": {
            "name": "TestCo",
            "stage": "Series A",
            "mission": "Test mission",
        },
        "role": {
            "title": "Founding ML Engineer",
            "description": "Build the inference stack.",
            "hard_requirements": ["3+ years ML infra"],
        },
    }
    with patch.object(role_builder, "call_claude", return_value=_fake_claude(_ROLE_RESPONSE)):
        client = TestClient(app)
        r = client.post("/api/v1/build/role-from-payload", json=payload)

    assert r.status_code == 200, r.text
    persona = r.json()
    assert persona["role_id"] == "r_test_001"
    assert persona["company_name"] == "TestCo"
    assert persona["role_title"] == "Founding ML Engineer"
    assert len(persona["claims"]) == 1


def test_role_from_payload_accepts_unknown_company_fields():
    """Forward-compat: extra fields on company/role pass through."""
    from src.agents import role_builder

    payload = {
        "role_id": "r_test_002",
        "company": {
            "name": "TestCo",
            "future_field": {"nested": "ok"},
        },
        "role": {
            "title": "TBD",
            "new_field": ["a", "b"],
        },
    }
    with patch.object(role_builder, "call_claude", return_value=_fake_claude(_ROLE_RESPONSE)):
        client = TestClient(app)
        r = client.post("/api/v1/build/role-from-payload", json=payload)
    assert r.status_code == 200, r.text


def test_role_from_payload_requires_role_id():
    payload = {
        "company": {"name": "TestCo"},
        "role": {"title": "Eng"},
    }
    client = TestClient(app)
    r = client.post("/api/v1/build/role-from-payload", json=payload)
    assert r.status_code == 422
    assert "role_id" in r.text


def test_role_from_payload_requires_company_name():
    payload = {
        "role_id": "r_x",
        "company": {},                  # missing name
        "role": {"title": "Eng"},
    }
    client = TestClient(app)
    r = client.post("/api/v1/build/role-from-payload", json=payload)
    assert r.status_code == 422
    assert "name" in r.text
