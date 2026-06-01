"""Shared Anthropic client + JSON parsing + cost accounting helpers."""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Optional

from anthropic import Anthropic, RateLimitError

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


_RETRY_DELAYS = [30, 60, 120]  # seconds to wait between retries on rate limit


@dataclass
class BatchRequest:
    custom_id: str
    system: str
    messages: list[dict]
    model: str
    max_tokens: int = 2048
    temperature: float = 0.7


def call_claude_batch(
    requests: list[BatchRequest],
    *,
    poll_interval: int = 30,
    label: str = "",
) -> dict[str, CallResult]:
    """Submit requests as a Message Batch (no per-minute rate limits). Blocks until done."""
    if not requests:
        return {}
    client = get_client()
    batch = client.messages.batches.create(
        requests=[
            {
                "custom_id": r.custom_id,
                "params": {
                    "model": r.model,
                    "max_tokens": r.max_tokens,
                    "temperature": r.temperature,
                    "system": r.system,
                    "messages": r.messages,
                },
            }
            for r in requests
        ]
    )
    logger.info("batch_submit label=%s id=%s count=%d", label or "?", batch.id, len(requests))

    while batch.processing_status != "ended":
        time.sleep(poll_interval)
        batch = client.messages.batches.retrieve(batch.id)
        logger.info("batch_poll id=%s status=%s", batch.id, batch.processing_status)

    results: dict[str, CallResult] = {}
    for item in client.messages.batches.results(batch.id):
        if item.result.type == "succeeded":
            msg = item.result.message
            text = "".join(
                block.text for block in msg.content if getattr(block, "type", None) == "text"
            )
            cost = estimate_cost_usd(msg.model, msg.usage.input_tokens, msg.usage.output_tokens)
            logger.info(
                "batch_result custom_id=%s model=%s in=%d out=%d cost=$%.5f",
                item.custom_id, msg.model, msg.usage.input_tokens, msg.usage.output_tokens, cost,
            )
            results[item.custom_id] = CallResult(
                text=text,
                input_tokens=msg.usage.input_tokens,
                output_tokens=msg.usage.output_tokens,
                cost_usd=cost,
                model=msg.model,
            )
        else:
            raise RuntimeError(
                f"Batch request {item.custom_id} failed: type={item.result.type}"
            )

    return results


def call_claude(
    *,
    system: str,
    messages: list[dict],
    model: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    label: str = "",
) -> CallResult:
    """Single, logged Claude call with retry on rate limit. Returns text + token + cost."""
    client = get_client()
    last_err: Exception | None = None
    for attempt, delay in enumerate([0] + _RETRY_DELAYS):
        if delay:
            logger.warning(
                "claude_call label=%s rate-limited, retrying in %ds (attempt %d/%d)",
                label or "?",
                delay,
                attempt,
                len(_RETRY_DELAYS) + 1,
            )
            time.sleep(delay)
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )
            break
        except RateLimitError as e:
            last_err = e
            continue
    else:
        raise last_err  # type: ignore[misc]
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
    """Parse JSON, attempting to recover from common Claude formatting glitches
    including truncated output caused by hitting max_tokens."""
    cleaned = strip_json_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback 1: find the outermost { ... } and try again.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass

        # Fallback 2: output was truncated mid-JSON (max_tokens hit).
        # Walk backwards from the end to find the last complete top-level value,
        # close any open arrays/objects, and return what we have.
        if start != -1:
            partial = _recover_truncated_json(cleaned[start:])
            if partial is not None:
                logger.warning(
                    "parse_json_strict(%s): recovered truncated JSON — some claims may be missing",
                    context,
                )
                return partial

        raise ValueError(
            f"Failed to parse JSON for {context}. Raw text: {text[:500]}"
        )


def _recover_truncated_json(s: str) -> dict | None:
    """Best-effort recovery for JSON truncated mid-stream (e.g. max_tokens).

    Strategy: keep removing the last incomplete element from arrays/objects
    until the JSON is valid, then close any still-open containers.
    """
    # Try progressively truncating at the last comma boundary
    for _ in range(30):
        last_comma = max(s.rfind(","), s.rfind("["))
        if last_comma == -1:
            break
        truncated = s[:last_comma]
        # Close any still-open arrays and objects
        depth_obj = truncated.count("{") - truncated.count("}")
        depth_arr = truncated.count("[") - truncated.count("]")
        candidate = truncated + ("]" * max(0, depth_arr)) + ("}" * max(0, depth_obj))
        try:
            result = json.loads(candidate)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass
        s = truncated
    return None
