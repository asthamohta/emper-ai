from fastapi import APIRouter, HTTPException

from src.agents import conversation as conversation_agent
from src.agents import judge as judge_agent
from src.agents import profile_builder, role_builder
from src.filters import pre_filter as pre_filter_mod
from src.mock_data import candidates as mock_candidates
from src.mock_data import roles as mock_roles
from src.models.conversation import Conversation
from src.models.persona import CandidatePersona, RolePersona
from src.models.verdict import JudgeVerdict
from src.storage import db

router = APIRouter()


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
