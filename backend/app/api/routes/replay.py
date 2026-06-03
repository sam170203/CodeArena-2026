from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Duel, DuelParticipant, DuelStep, ReplayEvent, User
from app.services.duel_roles import host_and_opponent
from app.services.elo import tier_for_elo

router = APIRouter(prefix="/replay", tags=["replay"])


@router.get("/{duel_id}")
def get_replay(duel_id: str, db: Session = Depends(get_db)):
    duel = db.query(Duel).filter(Duel.id == duel_id).first()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")

    parts = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )

    def _participant(row, is_host: bool):
        user = db.query(User).filter(User.id == row.user_id).first()
        elo = (user.elo if user else 1200) or 1200
        return {
            "user_id": row.user_id,
            "username": user.username if user else row.user_id,
            "cf_handle": user.cf_handle if user else None,
            "elo": elo,
            "tier": tier_for_elo(elo).key,
            "role": "host" if is_host else "opponent",
        }

    host_row, opp_row = host_and_opponent(duel, parts)
    participants = []
    if host_row:
        participants.append(_participant(host_row, True))
    if opp_row:
        participants.append(_participant(opp_row, False))

    step_rows = (
        db.query(DuelStep)
        .filter(DuelStep.duel_id == duel.id)
        .order_by(DuelStep.step_index.asc())
        .all()
    )
    steps = [
        {
            "step_index": s.step_index,
            "rating": s.rating,
            "problem": {
                "contest_id": s.problem_contest_id,
                "index": s.problem_index,
                "name": s.problem_name,
                "rating": s.rating,
                "problem_id": s.problem_id,
                "tags": json.loads(s.problem_tags_json) if s.problem_tags_json else [],
            },
            "host_status": s.host_status,
            "opponent_status": s.opponent_status,
        }
        for s in step_rows
    ]

    event_rows = (
        db.query(ReplayEvent)
        .filter(ReplayEvent.duel_id == duel.id)
        .order_by(ReplayEvent.ts_offset_ms.asc(), ReplayEvent.id.asc())
        .all()
    )
    events = []
    for e in event_rows:
        try:
            payload = json.loads(e.payload_json) if e.payload_json else {}
        except Exception:
            payload = {}
        events.append(
            {
                "ts_offset_ms": e.ts_offset_ms,
                "user_id": e.user_id,
                "event_type": e.event_type,
                "payload": payload,
            }
        )

    duration_s = (
        int((duel.finished_at - duel.started_at).total_seconds())
        if duel.started_at and duel.finished_at
        else 0
    )

    return {
        "duel_id": duel.id,
        "status": duel.status,
        "winner_id": duel.winner_id,
        "started_at": duel.started_at.isoformat() if duel.started_at else None,
        "finished_at": duel.finished_at.isoformat() if duel.finished_at else None,
        "duration_seconds": duration_s,
        "time_cap_seconds": duel.time_cap_seconds,
        "participants": participants,
        "steps": steps,
        "events": events,
    }
