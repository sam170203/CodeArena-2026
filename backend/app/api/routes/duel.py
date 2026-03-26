import uuid
import time
from datetime import datetime
from typing import Optional, Dict, Any

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

# In-memory storage for MVP
duels: Dict[str, Dict[str, Any]] = {}
_problem_cache: Dict[str, Dict[str, Any]] = {}


def _validate_uuid(value: str, field_name: str) -> None:
    try:
        uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")


def _build_problem_id(problem: Dict[str, Any]) -> str:
    contest_id = problem.get("contest_id")
    index = problem.get("index")

    if contest_id is None or index is None:
        raise HTTPException(status_code=500, detail="Generated problem is missing contest_id/index")

    return f"{contest_id}-{index}"


@router.post("/create", response_model=DuelCreateResponse)
def create_duel(data: DuelCreate):
    _validate_uuid(data.host_id, "host_id")

    if data.rating and (data.rating < 800 or data.rating > 3500):
        raise HTTPException(status_code=400, detail="Rating must be between 800 and 3500")

    problem_list = CodeforcesService.generate_practice(
        rating=data.rating or 1200,
        count=1,
    )

    if not problem_list:
        raise HTTPException(status_code=500, detail="Failed to generate problem. Try again later.")

    problem = problem_list[0]
    problem_id = _build_problem_id(problem)
    duel_id = str(uuid.uuid4())

    duel = {
        "id": duel_id,
        "initiator_id": data.host_id,
        "opponent_id": None,
        "problem_id": problem_id,
        "problem_name": problem.get("name"),
        "rating": problem.get("rating"),
        "status": "waiting",
        "winner_id": None,
        "started_at": None,
        "finished_at": None,
        "created_at": datetime.utcnow(),
        "last_submission_time": {},
    }

    duels[duel_id] = duel
    _problem_cache[duel_id] = problem

    return DuelCreateResponse(
        duel_id=duel_id,
        problem_id=problem_id,
        problem_name=problem.get("name"),
        rating=problem.get("rating"),
        status="waiting",
    )


@router.post("/join", response_model=DuelOut)
def join_duel(data: DuelJoin):
    _validate_uuid(data.duel_id, "duel_id")
    _validate_uuid(data.opponent_id, "opponent_id")

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
    _validate_uuid(duel_id, "duel_id")
    _validate_uuid(user_id, "user_id")

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
    duel["started_at"] = datetime.utcnow()

    problem = _problem_cache.get(duel_id, {})

    return DuelStartResponse(
        duel_id=duel_id,
        status="active",
        problem_id=duel["problem_id"],
        problem_name=problem.get("name"),
        message="Duel started! First correct submission wins.",
    )


@router.get("/{duel_id}", response_model=DuelOut)
def get_duel(duel_id: str):
    _validate_uuid(duel_id, "duel_id")

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
    _validate_uuid(duel_id, "duel_id")
    _validate_uuid(user_id, "user_id")

    duel = duels.get(duel_id)

    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    if user_id not in [duel["initiator_id"], duel["opponent_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant")

    if duel["status"] != "active":
        raise HTTPException(status_code=403, detail="Duel not started yet")

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
    _validate_uuid(duel_id, "duel_id")
    _validate_uuid(user_id, "user_id")

    duel = duels.get(duel_id)

    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    if user_id not in [duel["initiator_id"], duel["opponent_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant")

    if duel["status"] == "finished":
        raise HTTPException(status_code=400, detail="Duel is finished")

    if duel["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Duel is {duel['status']}, submissions not allowed",
        )

    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.cf_handle:
        raise HTTPException(
            status_code=400,
            detail="Set your Codeforces handle using /auth/cf-handle before submitting",
        )

    problem_id = duel.get("problem_id")
    if not problem_id or "-" not in str(problem_id):
        raise HTTPException(status_code=500, detail="Invalid problem in duel")

    now = time.time()
    last_time = duel["last_submission_time"].get(user_id)
    if last_time and now - last_time < 5:
        raise HTTPException(
            status_code=429,
            detail="Too many submissions. Please wait 5 seconds.",
        )

    result_data = CodeforcesService.check_problem_solved(
        user.cf_handle,
        problem_id,
    )

    if result_data is None:
        raise HTTPException(
            status_code=503,
            detail="Codeforces API unavailable, please retry",
        )

    verdict = result_data.get("verdict", "UNKNOWN")
    success = result_data.get("solved", False)

    duel["last_submission_time"][user_id] = now

    submit_result = DuelSubmitResult(
        duel_id=duel_id,
        user_id=user_id,
        success=success,
        verdict=verdict,
        winner_id=None,
    )

    if success:
        duel["status"] = "finished"
        duel["winner_id"] = user_id
        duel["finished_at"] = datetime.utcnow()
        submit_result.winner_id = user_id

    return submit_result