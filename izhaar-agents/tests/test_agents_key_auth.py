"""Tests for the X-Agents-Key dependency on /api/v1/*.

Two behaviors:
  - When AGENTS_API_KEY is unset, the dependency is a no-op (dev mode).
  - When AGENTS_API_KEY is set, every /api/v1/* request needs a matching
    X-Agents-Key header. /healthz and / (static UI) are always exempt.
"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from src import config
from src.main import app


def test_dev_mode_no_key_required():
    """With AGENTS_API_KEY unset, /api/v1/* is reachable without any header."""
    with patch.object(config, "AGENTS_API_KEY", ""):
        client = TestClient(app)
        r = client.get("/api/v1/mock/candidates")
        assert r.status_code == 200


def test_protected_route_rejects_without_key():
    """With AGENTS_API_KEY set, missing header → 401."""
    with patch.object(config, "AGENTS_API_KEY", "shh-secret"):
        client = TestClient(app)
        r = client.get("/api/v1/mock/candidates")
        assert r.status_code == 401
        assert "X-Agents-Key" in r.json()["detail"]


def test_protected_route_rejects_bad_key():
    """With AGENTS_API_KEY set, wrong header → 401."""
    with patch.object(config, "AGENTS_API_KEY", "shh-secret"):
        client = TestClient(app)
        r = client.get("/api/v1/mock/candidates", headers={"X-Agents-Key": "wrong"})
        assert r.status_code == 401


def test_protected_route_accepts_matching_key():
    """With AGENTS_API_KEY set, matching header → 200."""
    with patch.object(config, "AGENTS_API_KEY", "shh-secret"):
        client = TestClient(app)
        r = client.get(
            "/api/v1/mock/candidates", headers={"X-Agents-Key": "shh-secret"}
        )
        assert r.status_code == 200


def test_healthz_is_exempt_even_when_key_set():
    """/healthz lives on the app, not the protected router — always reachable."""
    with patch.object(config, "AGENTS_API_KEY", "shh-secret"):
        client = TestClient(app)
        r = client.get("/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


def test_static_ui_is_exempt_even_when_key_set():
    """The HTML UI at / lives on the app, not the protected router."""
    with patch.object(config, "AGENTS_API_KEY", "shh-secret"):
        client = TestClient(app)
        r = client.get("/")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/html")
