import json
import logging
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from src.agents import conversation as conversation_agent
from src.agents import judge as judge_agent
from src.agents import profile_builder, role_builder
from src.api._auth import require_agents_key
from src.api._payloads import BuildCandidateRequest, BuildRoleRequest, RunMatchRequest
from src.filters import pre_filter as pre_filter_mod
from src.integration import scraper_db
from src.mock_data import candidates as mock_candidates
from src.mock_data import roles as mock_roles
from src.models.conversation import Conversation
from src.models.persona import CandidatePersona, RolePersona
from src.models.verdict import JudgeVerdict
from src.storage import db

logger = logging.getLogger(__name__)

# Every route on this router goes through the X-Agents-Key dependency. When
# AGENTS_API_KEY is unset, the dependency is a no-op. The healthcheck and
# the static UI live on the app (src/main.py), NOT on this router, so they
# remain unauthenticated regardless of env state.
router = APIRouter(dependencies=[Depends(require_agents_key)])


@router.post("/persona/build/candidate/{candidate_id}", response_model=CandidatePersona)
def build_candidate(candidate_id: str) -> CandidatePersona:
    scraper_output = mock_candidates.get_by_id(candidate_id)
    if not scraper_output:
        raise HTTPException(status_code=404, detail="Candidate not found")
    persona = profile_builder.build_candidate_persona(candidate_id, scraper_output)
    db.save_candidate_persona(persona)
    return persona


@router.post("/persona/build/role/{role_id}", response_model=RolePersona)
def build_role(role_id: str) -> RolePersona:
    role_data = mock_roles.get_by_id(role_id)
    if not role_data:
        raise HTTPException(status_code=404, detail="Role not found")
    persona = role_builder.build_role_persona(role_id, role_data)
    db.save_role_persona(persona)
    return persona


# ---- Stateless build endpoints (integrated path) -----------------------------
#
# Next.js calls these. The multi-source dict (for candidates) or the role+
# company dict (for roles) is sent in the request body — the Python service
# does NOT read from any database. Returned personas are persisted by the
# Next.js side in candidate_personas / role personas (Part 2 / Part 6).
# This is the contract committed to in Q1 of the integration plan: Python
# is a pure function, Next.js owns persistence.

@router.post("/build/candidate-from-payload", response_model=CandidatePersona)
def build_candidate_from_payload(body: BuildCandidateRequest) -> CandidatePersona:
    # exclude_none keeps the dict clean; the profile_builder treats missing
    # source branches identically to None-valued ones.
    input_dict = body.model_dump(exclude_none=True)
    return profile_builder.build_candidate_persona(body.candidate_id, input_dict)


@router.post("/build/role-from-payload", response_model=RolePersona)
def build_role_from_payload(body: BuildRoleRequest) -> RolePersona:
    input_dict = body.model_dump(exclude_none=True)
    return role_builder.build_role_persona(body.role_id, input_dict)


@router.post("/match/run-from-payload")
def match_run_from_payload(body: RunMatchRequest) -> dict:
    """Stateless match pipeline: pre-filter → conversation → judge.

    Per the integration plan (Q1), takes full persona objects in the body
    and returns the full result. Next.js owns persistence. Mirror of
    `/match/run` (which reads personas from the local SQLite for the
    standalone UI) but parameterized purely by payload.
    """
    candidate_persona = CandidatePersona.model_validate(body.candidate_persona)
    role_persona = RolePersona.model_validate(body.role_persona)

    # Pre-filter
    passed, score = pre_filter_mod.pre_filter(candidate_persona, role_persona)
    if not passed:
        return {
            "prefilter": {"passed": False, "score": score},
            "conversation": None,
            "verdict": None,
        }

    # Conversation
    conversation = conversation_agent.run_conversation(candidate_persona, role_persona)

    # Judge
    verdict = judge_agent.judge_conversation(conversation, candidate_persona, role_persona)

    return {
        "prefilter": {"passed": True, "score": score},
        "conversation": conversation.model_dump(mode="json"),
        "verdict": verdict.model_dump(mode="json"),
    }


@router.post("/match/run")
def run_match(candidate_id: str, role_id: str) -> dict:
    """End-to-end: pre-filter → conversation → judge."""
    candidate_persona = db.get_candidate_persona(candidate_id)
    role_persona = db.get_role_persona(role_id)

    if not candidate_persona or not role_persona:
        raise HTTPException(
            status_code=404,
            detail="Persona not found — build personas first via /persona/build/...",
        )

    passed, score = pre_filter_mod.pre_filter(candidate_persona, role_persona)
    if not passed:
        return {
            "stage": "pre_filter",
            "passed": False,
            "score": score,
            "reason": "Failed pre-filter",
            "candidate_id": candidate_id,
            "role_id": role_id,
        }

    conv = conversation_agent.run_conversation(candidate_persona, role_persona)
    db.save_conversation(conv)

    verdict = judge_agent.judge_conversation(conv, candidate_persona, role_persona)
    db.save_verdict(verdict)

    return {
        "stage": "complete",
        "passed_pre_filter": True,
        "pre_filter_score": score,
        "conversation_id": conv.conversation_id,
        "turns": conv.turn_count,
        "termination": conv.termination_reason,
        "walked_away_by": conv.walked_away_by,
        "conversation_cost_usd": round(conv.cost_usd, 5),
        "verdict": verdict.match_verdict,
        "confidence": verdict.confidence,
        "surface_to_human": verdict.surface_to_human,
        "reasoning": verdict.reasoning,
    }


@router.get("/persona/candidate/{candidate_id}", response_model=CandidatePersona)
def get_candidate_persona(candidate_id: str) -> CandidatePersona:
    persona = db.get_candidate_persona(candidate_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.get("/persona/role/{role_id}", response_model=RolePersona)
def get_role_persona(role_id: str) -> RolePersona:
    persona = db.get_role_persona(role_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.get("/conversation/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: str) -> Conversation:
    conv = db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/verdict/conversation/{conversation_id}", response_model=JudgeVerdict)
def get_verdict(conversation_id: str) -> JudgeVerdict:
    verdict = db.get_verdict_for_conversation(conversation_id)
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict not found")
    return verdict


@router.post("/seed")
def seed_all_personas() -> dict:
    """Build personas for all mock candidates and roles."""
    results: dict = {"candidates": [], "roles": []}
    for c in mock_candidates.ALL:
        persona = profile_builder.build_candidate_persona(c["candidate_id"], c)
        db.save_candidate_persona(persona)
        results["candidates"].append(c["candidate_id"])
    for r in mock_roles.ALL:
        persona = role_builder.build_role_persona(r["role_id"], r)
        db.save_role_persona(persona)
        results["roles"].append(r["role_id"])
    return results


@router.post("/seed/roles")
def seed_roles_only() -> dict:
    """Rebuild only role personas. Use after editing mock_data/roles.py."""
    rebuilt: list[str] = []
    for r in mock_roles.ALL:
        persona = role_builder.build_role_persona(r["role_id"], r)
        db.save_role_persona(persona)
        rebuilt.append(r["role_id"])
    return {"roles": rebuilt}


@router.post("/seed/candidates")
def seed_candidates_only() -> dict:
    """Rebuild only candidate personas."""
    rebuilt: list[str] = []
    for c in mock_candidates.ALL:
        persona = profile_builder.build_candidate_persona(c["candidate_id"], c)
        db.save_candidate_persona(persona)
        rebuilt.append(c["candidate_id"])
    return {"candidates": rebuilt}


# ---- Match history -----------------------------------------------------------


@router.get("/matches")
def list_matches(limit: int = 100) -> list[dict]:
    """List past matches (newest first) with personas + conversation metadata joined."""
    return db.list_match_summaries(limit=limit)


# ---- Streaming match run (Server-Sent Events) --------------------------------


def _sse(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event chunk."""
    return f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"


@router.get("/match/run-stream")
def run_match_stream(candidate_id: str, role_id: str) -> StreamingResponse:
    """Same pipeline as POST /match/run, but streams events live via SSE.

    The browser uses EventSource(...) which is GET-only — that's why this is GET.
    Event types: prefilter, conversation_started, turn_started, turn, sycophancy,
    terminated, judging, verdict, complete, error.
    """
    candidate_persona = db.get_candidate_persona(candidate_id)
    role_persona = db.get_role_persona(role_id)
    if not candidate_persona or not role_persona:
        raise HTTPException(
            status_code=404,
            detail="Persona not found — build personas first via /persona/build/...",
        )

    def gen() -> Iterator[str]:
        try:
            # Pre-filter (synchronous, no LLM)
            passed, score = pre_filter_mod.pre_filter(candidate_persona, role_persona)
            yield _sse(
                "prefilter",
                {
                    "passed": passed,
                    "score": score,
                    "candidate_id": candidate_id,
                    "role_id": role_id,
                },
            )
            if not passed:
                yield _sse(
                    "complete",
                    {
                        "stage": "pre_filter",
                        "passed": False,
                        "score": score,
                    },
                )
                return

            # Conversation (streams turn-by-turn)
            conversation: Conversation | None = None
            for event in conversation_agent.run_conversation_events(
                candidate_persona, role_persona
            ):
                etype = event["type"]
                if etype == "complete":
                    conversation = Conversation.model_validate(event["conversation"])
                    db.save_conversation(conversation)
                    yield _sse(
                        "conversation_complete",
                        {
                            "conversation_id": conversation.conversation_id,
                            "turn_count": conversation.turn_count,
                            "cost_usd": conversation.cost_usd,
                            "termination_reason": conversation.termination_reason,
                            "walked_away_by": conversation.walked_away_by,
                        },
                    )
                else:
                    # Forward all other events directly.
                    yield _sse(etype, {k: v for k, v in event.items() if k != "type"})

            if conversation is None:
                yield _sse("error", {"message": "Conversation did not complete."})
                return

            # Judge
            yield _sse("judging", {"conversation_id": conversation.conversation_id})
            verdict = judge_agent.judge_conversation(
                conversation, candidate_persona, role_persona
            )
            db.save_verdict(verdict)
            yield _sse(
                "verdict",
                {
                    "verdict_id": verdict.verdict_id,
                    "conversation_id": verdict.conversation_id,
                    "match_verdict": verdict.match_verdict,
                    "confidence": verdict.confidence,
                    "reasoning": verdict.reasoning,
                    "evidence_for_match": verdict.evidence_for_match,
                    "evidence_against_match": verdict.evidence_against_match,
                    "unresolved_concerns": verdict.unresolved_concerns,
                    "bias_flags": verdict.bias_flags,
                    "surface_to_human": verdict.surface_to_human,
                },
            )

            yield _sse(
                "complete",
                {
                    "stage": "complete",
                    "conversation_id": conversation.conversation_id,
                    "verdict": verdict.match_verdict,
                    "surface_to_human": verdict.surface_to_human,
                    "cost_usd": conversation.cost_usd,
                },
            )
        except Exception as exc:  # noqa: BLE001 — top-level safety net for the stream
            logger.exception("run_match_stream failed")
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/persona/status")
def persona_status() -> dict:
    """Which mock candidates/roles already have a built persona in storage."""
    candidates_built = [
        c["candidate_id"]
        for c in mock_candidates.ALL
        if db.get_candidate_persona(c["candidate_id"]) is not None
    ]
    roles_built = [
        r["role_id"]
        for r in mock_roles.ALL
        if db.get_role_persona(r["role_id"]) is not None
    ]
    return {
        "candidates_built": candidates_built,
        "roles_built": roles_built,
        "candidates_total": len(mock_candidates.ALL),
        "roles_total": len(mock_roles.ALL),
    }


@router.get("/mock/candidates")
def list_mock_candidates() -> list[dict]:
    return [
        {"candidate_id": c["candidate_id"], "name": c.get("name", "")}
        for c in mock_candidates.ALL
    ]


@router.get("/mock/roles")
def list_mock_roles() -> list[dict]:
    return [
        {
            "role_id": r["role_id"],
            "company": r.get("company", {}).get("name", ""),
            "title": r.get("role", {}).get("title", ""),
        }
        for r in mock_roles.ALL
    ]


# ---- Scraper DB integration --------------------------------------------------


@router.get("/scraper/healthz")
def scraper_db_healthz() -> dict:
    """Is the Next.js side's Postgres reachable? Counts of rows we care about."""
    return scraper_db.healthcheck()


@router.get("/scraper/candidates")
def list_scraper_candidates(limit: int = 50) -> list[dict]:
    """List candidates known to the scraper DB (id, name, doc count)."""
    try:
        return scraper_db.list_candidates(limit=limit)
    except scraper_db.ScraperDBUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/scraper/jobs")
def list_scraper_jobs(limit: int = 50) -> list[dict]:
    """List jobs known to the scraper DB."""
    try:
        return scraper_db.list_jobs(limit=limit)
    except scraper_db.ScraperDBUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/persona/build/candidate-from-db/{candidate_id}", response_model=CandidatePersona)
def build_candidate_from_db(candidate_id: str) -> CandidatePersona:
    """Build a candidate persona by reading documents from the scraper DB.

    The candidate_id is the UUID from the Next.js side's `candidates.id`.
    """
    try:
        bundle = scraper_db.fetch_candidate_bundle(candidate_id)
    except scraper_db.ScraperDBUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not bundle:
        raise HTTPException(status_code=404, detail="Candidate not found in scraper DB")
    if not bundle.get("sources"):
        raise HTTPException(
            status_code=422,
            detail="Candidate has no documents — nothing to build a persona from.",
        )

    persona = profile_builder.build_candidate_persona(candidate_id, bundle)
    db.save_candidate_persona(persona)
    return persona


@router.post("/persona/build/role-from-db/{job_id}", response_model=RolePersona)
def build_role_from_db(job_id: str) -> RolePersona:
    """Build a role persona by reading a job + company docs from the scraper DB."""
    try:
        bundle = scraper_db.fetch_job_bundle(job_id)
    except scraper_db.ScraperDBUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not bundle:
        raise HTTPException(status_code=404, detail="Job not found in scraper DB")

    persona = role_builder.build_role_persona(job_id, bundle)
    db.save_role_persona(persona)
    return persona
