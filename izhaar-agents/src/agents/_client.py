"""Shared Anthropic client + JSON parsing + cost accounting helpers."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from anthropic import Anthropic

from src import config

logger = logging.getLogger(__name__)

_client: Optional[Anthropic] = None


def get_client() -> Anthropic:
    global _client
    if _client is None:
        if not config.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to .env or your shell environment."
            )
        _client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


# Rough public pricing (USD per 1M tokens). Adjust if Anthropic publishes updates.
_PRICING_USD_PER_M = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-sonnet-4-5": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0},
    "claude-opus-4-7": {"input": 15.0, "output": 75.0},
}


def estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    p = _PRICING_USD_PER_M.get(model)
    if p is None:
        return 0.0
    return (input_tokens / 1_000_000.0) * p["input"] + (output_tokens / 1_000_000.0) * p["output"]


@dataclass
class CallResult:
    text: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model: str


def call_claude(
    *,
    system: str,
    messages: list[dict],
    model: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    label: str = "",
) -> CallResult:
    """Single, logged Claude call. Returns text + token + cost."""
    client = get_client()
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=messages,
    )
    # Concatenate any text blocks (Claude may return multiple).
    text_parts = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    text = "".join(text_parts)
    cost = estimate_cost_usd(model, resp.usage.input_tokens, resp.usage.output_tokens)
    logger.info(
        "claude_call label=%s model=%s in=%d out=%d cost=$%.5f",
        label or "?",
        model,
        resp.usage.input_tokens,
        resp.usage.output_tokens,
        cost,
    )
    return CallResult(
        text=text,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
        cost_usd=cost,
        model=model,
    )


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE | re.MULTILINE)


def strip_json_fences(text: str) -> str:
    """Strip markdown code fences. Claude sometimes adds them despite instructions."""
    stripped = text.strip()
    if stripped.startswith("```"):
        # Remove leading fence
        stripped = re.sub(r"^```(?:json)?\s*\n?", "", stripped, count=1, flags=re.IGNORECASE)
        # Remove trailing fence
        stripped = re.sub(r"\n?```\s*$", "", stripped, count=1)
    return stripped.strip()


def parse_json_strict(text: str, *, context: str = "") -> dict:
    """Parse JSON, attempting to recover from common Claude formatting glitches."""
    cleaned = strip_json_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: find the first { and last } and try again.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise ValueError(
            f"Failed to parse JSON for {context}. Raw text: {text[:500]}"
        )
