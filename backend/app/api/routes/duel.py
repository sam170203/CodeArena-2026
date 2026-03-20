import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import (
    DuelCreate,
    DuelCreateResponse,
    DuelJoin,
    DuelStartResponse,
    DuelSubmitResult,
    DuelOut,
)
from app.services.codeforces import CodeforcesService
from app import crud

router = APIRouter(prefix="/duel", tags=["duel"])

duels: Dict[str, Dict[str, Any]] = {}
_problem_cache: Dict[str, Dict[str, Any]] = {}


@router.post("/create", response_model=DuelCreateResponse)
def create_duel(data: DuelCreate):
    problem = CodeforcesService.generate_practice(
        rating=data.rating or 1200,
        count=1
    )
    
    if not problem:
        raise HTTPException(status_code=500, detail="Failed to generate problem")
    
    problem = problem[0]
    duel_id = str(uuid.uuid4())
    
    duel = {
        "id": duel_id,
        "initiator_id": data.host_id,
        "opponent_id": None,
        "problem_id": problem["id"],
        "problem_name": problem.get("name"),
        "rating": problem.get("rating"),
        "status": "waiting",
        "winner_id": None,
        "started_at": None,
        "finished_at": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    duels[duel_id] = duel
    _problem_cache[duel_id] = problem
    
    return DuelCreateResponse(
        duel_id=duel_id,
        problem_id=problem["id"],
        problem_name=problem.get("name"),
        rating=problem.get("rating"),
        status="waiting"
    )


@router.post("/join", response_model=DuelOut)
def join_duel(data: DuelJoin):
    duel = duels.get(data.duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Duel is not accepting players")
    
    if duel["initiator_id"] == data.opponent_id:
        raise HTTPException(status_code=400, detail="Cannot join your own duel")
    
    duel["opponent_id"] = data.opponent_id
    
    return DuelOut(
        id=duel["id"],
        initiator_id=duel["initiator_id"],
        opponent_id=duel["opponent_id"],
        problem_id=duel["problem_id"],
        status=duel["status"],
        winner_id=duel["winner_id"],
        started_at=duel["started_at"],
        finished_at=duel["finished_at"],
    )


@router.post("/start", response_model=DuelStartResponse)
def start_duel(duel_id: str, user_id: str):
    duel = duels.get(duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    if duel["initiator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only host can start the duel")
    
    if not duel["opponent_id"]:
        raise HTTPException(status_code=400, detail="Waiting for opponent")
    
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Duel already started or finished")
    
    duel["status"] = "active"
    duel["started_at"] = datetime.utcnow().isoformat()
    
    problem = _problem_cache.get(duel_id, {})
    
    return DuelStartResponse(
        duel_id=duel_id,
        status="active",
        problem_id=duel["problem_id"],
        problem_name=problem.get("name"),
        message="Duel started! First correct submission wins."
    )


@router.get("/{duel_id}", response_model=DuelOut)
def get_duel(duel_id: str):
    duel = duels.get(duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    return DuelOut(
        id=duel["id"],
        initiator_id=duel["initiator_id"],
        opponent_id=duel["opponent_id"],
        problem_id=duel["problem_id"],
        status=duel["status"],
        winner_id=duel["winner_id"],
        started_at=duel["started_at"],
        finished_at=duel["finished_at"],
    )


@router.get("/{duel_id}/problem")
def get_duel_problem(duel_id: str, user_id: str):
    duel = duels.get(duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    if user_id not in [duel["initiator_id"], duel["opponent_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    if duel["status"] != "active":
        raise HTTPException(status_code=400, detail="Duel not active")
    
    problem = _problem_cache.get(duel_id, {})
    
    return {
        "problem_id": duel["problem_id"],
        "problem_name": problem.get("name"),
        "rating": problem.get("rating"),
        "tags": problem.get("tags", []),
        "time_limit": problem.get("time_limit"),
        "memory_limit": problem.get("memory_limit"),
    }


@router.post("/submit", response_model=DuelSubmitResult)
def submit_solution(duel_id: str, user_id: str, db: Session = Depends(get_db)):
    duel = duels.get(duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    if user_id not in [duel["initiator_id"], duel["opponent_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    if duel["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Duel is {duel['status']}, submissions closed"
        )
    
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.cf_handle:
        raise HTTPException(
            status_code=400,
            detail="Set your Codeforces handle using /auth/cf-handle before submitting"
        )
    
    result_data = CodeforcesService.check_problem_solved(
        user.cf_handle,
        duel["problem_id"]
    )
    
    if result_data is None:
        raise HTTPException(
            status_code=503,
            detail="Codeforces API unavailable, please retry"
        )
    
    success = result_data.get("solved", False)
    verdict = result_data.get("verdict", "UNKNOWN")
    
    submit_result = DuelSubmitResult(
        duel_id=duel_id,
        user_id=user_id,
        success=success,
        verdict=verdict,
        winner_id=None
    )
    
    if success:
        duel["status"] = "finished"
        duel["winner_id"] = user_id
        duel["finished_at"] = datetime.utcnow().isoformat()
        submit_result.winner_id = user_id
    
    return submit_result
