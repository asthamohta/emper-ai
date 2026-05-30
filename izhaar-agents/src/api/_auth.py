"""FastAPI dependency that enforces the optional X-Agents-Key shared secret.

Behavior:
  - If AGENTS_API_KEY is unset (or empty) in the environment, every request
    passes through. This is dev mode — the standalone static UI at "/" needs
    to call /api/v1/* from the browser without a key, so leaving the env
    unset keeps that flow working.
  - If AGENTS_API_KEY is set, every protected request must carry a matching
    X-Agents-Key header. The Next.js side (src/lib/agents-client.ts) sends
    this header when its own AGENTS_API_KEY env var is set.

Mounted on the /api/v1 APIRouter. /healthz and / (static UI) are app-level
endpoints, not on the router, so they're exempt automatically.
"""

from typing import Optional

from fastapi import Header, HTTPException, status

from src import config


def require_agents_key(
    x_agents_key: Optional[str] = Header(default=None),
) -> None:
    # `Optional[str]` (not `str | None`) is intentional: FastAPI evaluates
    # dependency annotations at runtime via typing.get_type_hints(), and PEP
    # 604 union syntax raises on Python 3.9 even with `from __future__
    # import annotations`. Optional keeps us cross-version safe.
    expected = config.AGENTS_API_KEY
    if not expected:
        return  # dev mode: no enforcement
    if x_agents_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Agents-Key.",
        )
