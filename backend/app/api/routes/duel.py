import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.models import Duel, DuelParticipant, User
from app.schemas import (
    DuelCreate,
    DuelCreateResponse,
    DuelJoin,
    DuelOut,
    DuelParticipantOut,
    DuelStartRequest,
    DuelStartResponse,
    DuelSubmitRequest,
    DuelSubmitResult,
)
from app.services.codeforces import CodeforcesService

router = APIRouter(prefix="/duel", tags=["duel"])


def _validate_uuid(value: str, field_name: str) -> None:
    try:
        uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")


def _participant_payload(db: Session, participant: DuelParticipant) -> DuelParticipantOut:
    user = db.query(User).filter(User.id == participant.user_id).first()
    return DuelParticipantOut(
        user_id=participant.user_id,
        username=user.username if user else participant.user_id,
        cf_rating=participant.current_rating or (user.cf_rating if user else 0),
        joined_at=participant.joined_at,
    )


def _participants(db: Session, duel_id: str) -> List[DuelParticipantOut]:
    rows = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel_id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )
    return [_participant_payload(db, row) for row in rows]


def _recalculate_room_rating(db: Session, duel: Duel) -> int:
    rows = db.query(DuelParticipant).filter(DuelParticipant.duel_id == duel.id).all()
    if not rows:
        duel.rating_target = 1200
        return 1200

    highest = 0
    for row in rows:
        user = db.query(User).filter(User.id == row.user_id).first()
        rating = row.current_rating or (user.cf_rating if user else 0) or 1200
        if rating > highest:
            highest = rating

    duel.rating_target = highest or 1200
    return duel.rating_target


def _assign_problem_for_room(db: Session, duel: Duel, force: bool = False) -> Duel:
    if duel.problem_id and duel.status == "active" and not force:
        return duel

    target = duel.rating_target or 1200
    problem_list = CodeforcesService.generate_practice(rating=target, count=1)
    if problem_list:
        problem = problem_list[0]
        duel.problem_id = problem.get("problem_id") or f"{problem.get('contest_id')}-{problem.get('index')}"
        duel.problem_name = problem.get("name")
        duel.problem_rating = problem.get("rating")
    return duel


def _serialize_duel(db: Session, duel: Duel) -> DuelOut:
    participants = _participants(db, duel.id)
    opponent_id = None
    if len(participants) >= 2:
        opponent_id = participants[1].user_id

    return DuelOut(
        id=duel.id,
        host_id=duel.host_id,
        opponent_id=opponent_id,
        problem_id=duel.problem_id,
        problem_name=duel.problem_name,
        problem_rating=duel.problem_rating,
        status=duel.status,
        winner_id=duel.winner_id,
        rating_target=duel.rating_target,
        max_participants=duel.max_participants,
        participants_count=len(participants),
        participants=participants,
        started_at=duel.started_at,
        finished_at=duel.finished_at,
    )


@router.post("/create", response_model=DuelCreateResponse)
def create_duel(data: DuelCreate, db: Session = Depends(get_db)):
    _validate_uuid(data.host_id, "host_id")

    if data.rating and (data.rating < 800 or data.rating > 3500):
        raise HTTPException(status_code=400, detail="Rating must be between 800 and 3500")

    host = db.query(User).filter(User.id == data.host_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="User not found")

    duel = Duel(
        id=str(uuid.uuid4()),
        host_id=data.host_id,
        max_participants=data.max_participants,
        rating_target=host.cf_rating or data.rating or 1200,
        status="waiting",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(duel)
    db.flush()

    db.add(
        DuelParticipant(
            duel_id=duel.id,
            user_id=host.id,
            current_rating=host.cf_rating or data.rating or 1200,
            joined_at=datetime.utcnow(),
        )
    )
    db.flush()

    _recalculate_room_rating(db, duel)
    _assign_problem_for_room(db, duel, force=True)

    db.commit()
    db.refresh(duel)

    return DuelCreateResponse(
        duel_id=duel.id,
        problem_id=duel.problem_id or "",
        problem_name=duel.problem_name,
        rating=duel.problem_rating,
        status=duel.status,
        participants_count=1,
        max_participants=duel.max_participants,
        rating_target=duel.rating_target,
    )


@router.get("/host/{host_id}", response_model=DuelOut)
def get_latest_duel_by_host(host_id: str, db: Session = Depends(get_db)):
    _validate_uuid(host_id, "host_id")

    duel = (
        db.query(Duel)
        .filter(
            Duel.host_id == host_id,
            Duel.status.in_(["waiting", "active"]),
        )
        .order_by(Duel.created_at.desc())
        .first()
    )

    if not duel:
        raise HTTPException(status_code=404, detail="No active or waiting duel found for this host")

    return _serialize_duel(db, duel)


@router.post("/join", response_model=DuelOut)
def join_duel(data: DuelJoin, db: Session = Depends(get_db)):
    _validate_uuid(data.duel_id, "duel_id")
    _validate_uuid(data.opponent_id, "opponent_id")

    duel = db.query(Duel).filter(Duel.id == data.duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    if duel.status != "waiting":
        raise HTTPException(status_code=400, detail="Duel is not accepting players")

    participants = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .all()
    )

    if any(p.user_id == data.opponent_id for p in participants):
        return _serialize_duel(db, duel)

    if len(participants) >= duel.max_participants:
        raise HTTPException(status_code=400, detail="Duel room is full")

    if duel.host_id == data.opponent_id:
        raise HTTPException(status_code=400, detail="Cannot join your own duel")

    user = db.query(User).filter(User.id == data.opponent_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.add(
        DuelParticipant(
            duel_id=duel.id,
            user_id=user.id,
            current_rating=user.cf_rating or 1200,
            joined_at=datetime.utcnow(),
        )
    )
    db.flush()

    _recalculate_room_rating(db, duel)
    _assign_problem_for_room(db, duel, force=True)

    db.commit()
    db.refresh(duel)

    return _serialize_duel(db, duel)


@router.post("/start", response_model=DuelStartResponse)
def start_duel(payload: DuelStartRequest, db: Session = Depends(get_db)):
    _validate_uuid(payload.duel_id, "duel_id")
    _validate_uuid(payload.user_id, "user_id")

    duel = db.query(Duel).filter(Duel.id == payload.duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    if duel.host_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Only host can start the duel")

    participants = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .all()
    )
    if len(participants) < 2:
        raise HTTPException(status_code=400, detail="Waiting for at least one opponent")

    if duel.status != "waiting":
        raise HTTPException(status_code=400, detail="Duel already started or finished")

    _recalculate_room_rating(db, duel)
    _assign_problem_for_room(db, duel, force=True)

    duel.status = "active"
    duel.started_at = datetime.utcnow()
    duel.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(duel)

    return DuelStartResponse(
        duel_id=duel.id,
        status=duel.status,
        problem_id=duel.problem_id or "",
        problem_name=duel.problem_name,
        message="Duel started! First correct submission wins.",
        participants_count=len(participants),
    )


@router.get("/{duel_id}", response_model=DuelOut)
def get_duel(duel_id: str, db: Session = Depends(get_db)):
    _validate_uuid(duel_id, "duel_id")

    duel = db.query(Duel).filter(Duel.id == duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    return _serialize_duel(db, duel)


@router.get("/{duel_id}/problem")
def get_duel_problem(duel_id: str, user_id: str, db: Session = Depends(get_db)):
    _validate_uuid(duel_id, "duel_id")
    _validate_uuid(user_id, "user_id")

    duel = db.query(Duel).filter(Duel.id == duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    participants = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .all()
    )
    if user_id not in [p.user_id for p in participants]:
        raise HTTPException(status_code=403, detail="Not a participant")

    if not duel.problem_id:
        _assign_problem_for_room(db, duel, force=True)
        db.commit()
        db.refresh(duel)

    return {
        "problem_id": duel.problem_id,
        "problem_name": duel.problem_name,
        "rating": duel.problem_rating,
        "tags": [],
        "time_limit": None,
        "memory_limit": None,
        "status": duel.status,
    }


@router.post("/submit", response_model=DuelSubmitResult)
def submit_solution(payload: DuelSubmitRequest, db: Session = Depends(get_db)):
    _validate_uuid(payload.duel_id, "duel_id")
    _validate_uuid(payload.user_id, "user_id")

    duel = db.query(Duel).filter(Duel.id == payload.duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    participant_rows = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .all()
    )
    participant_user_ids = [p.user_id for p in participant_rows]

    if payload.user_id not in participant_user_ids:
        raise HTTPException(status_code=403, detail="Not a participant")

    if duel.status == "finished":
        raise HTTPException(status_code=400, detail="Duel is finished")

    if duel.status != "active":
        raise HTTPException(status_code=400, detail=f"Duel is {duel.status}, submissions not allowed")

    user = crud.get_user_by_id(db, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.cf_handle:
        raise HTTPException(
            status_code=400,
            detail="Set your Codeforces handle using /auth/cf-handle before submitting",
        )

    if not duel.problem_id:
        _assign_problem_for_room(db, duel, force=True)
        db.commit()
        db.refresh(duel)

    result_data = CodeforcesService.check_problem_solved(user.cf_handle, duel.problem_id)
    if result_data is None:
        raise HTTPException(status_code=503, detail="Codeforces API unavailable, please retry")

    verdict = result_data.get("verdict", "UNKNOWN")
    success = result_data.get("solved", False)

    submit_result = DuelSubmitResult(
        duel_id=duel.id,
        user_id=user.id,
        success=success,
        verdict=verdict,
        winner_id=None,
    )

    if success:
        duel.status = "finished"
        duel.winner_id = user.id
        duel.finished_at = datetime.utcnow()
        duel.updated_at = datetime.utcnow()
        submit_result.winner_id = user.id

        for p in participant_rows:
            participant_user = db.query(User).filter(User.id == p.user_id).first()
            if not participant_user:
                continue
            if p.user_id == user.id:
                participant_user.duel_wins += 1
            else:
                participant_user.duel_losses += 1

    db.commit()
    db.refresh(duel)

    return submit_result