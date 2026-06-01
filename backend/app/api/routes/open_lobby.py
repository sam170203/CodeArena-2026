from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Duel, DuelParticipant, FriendRoom, User
from app.services.elo import tier_for_elo

router = APIRouter(prefix="/lobby", tags=["lobby"])


@router.get("/active-duels")
def list_active_duels(db: Session = Depends(get_db)):
    """List active duels that anyone can spectate."""
    duels = (
        db.query(Duel)
        .filter(Duel.status == "active")
        .order_by(Duel.started_at.desc())
        .limit(50)
        .all()
    )
    out = []
    for d in duels:
        parts = (
            db.query(DuelParticipant)
            .filter(DuelParticipant.duel_id == d.id)
            .order_by(DuelParticipant.joined_at.asc())
            .all()
        )
        ps = []
        for p in parts:
            u = db.query(User).filter(User.id == p.user_id).first()
            elo = (u.elo if u else 1200) or 1200
            ps.append(
                {
                    "user_id": p.user_id,
                    "username": u.username if u else p.user_id,
                    "elo": elo,
                    "tier": tier_for_elo(elo).key,
                }
            )
        out.append(
            {
                "duel_id": d.id,
                "format": d.format,
                "rating_target": d.rating_target,
                "started_at": d.started_at.isoformat() if d.started_at else None,
                "time_cap_seconds": d.time_cap_seconds,
                "participants": ps,
            }
        )
    return out


@router.get("/open-rooms")
def list_open_rooms(db: Session = Depends(get_db)):
    """List friend rooms still waiting for an opponent — public to join."""
    cutoff = datetime.utcnow() - timedelta(minutes=15)
    rooms = (
        db.query(FriendRoom)
        .filter(
            FriendRoom.status == "waiting",
            FriendRoom.created_at >= cutoff,
        )
        .order_by(FriendRoom.created_at.desc())
        .limit(30)
        .all()
    )
    out = []
    for r in rooms:
        host = db.query(User).filter(User.id == r.host_id).first()
        elo = (host.elo if host else 1200) or 1200
        out.append(
            {
                "id": r.id,
                "code": r.code,
                "rating_preset": r.rating_preset,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "host": {
                    "user_id": r.host_id,
                    "username": host.username if host else r.host_id,
                    "elo": elo,
                    "tier": tier_for_elo(elo).key,
                },
            }
        )
    return out
