from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AsyncChallenge, User
from app.services.problem_picker import get_all_problems
from app.api.routes.auth import _get_current_user
from app.services.elo import tier_for_elo

router = APIRouter(prefix="/async-challenge", tags=["async-challenge"])


WINDOW_MINUTES = 90
ACCEPT_DEADLINE_HOURS = 24


class CreateChallengeRequest(BaseModel):
    recipient_username: str


def _serialize(c: AsyncChallenge, db: Session) -> dict:
    sender = db.query(User).filter(User.id == c.sender_id).first()
    recipient = db.query(User).filter(User.id == c.recipient_id).first()
    return {
        "id": c.id,
        "status": c.status,
        "sender": {
            "user_id": c.sender_id,
            "username": sender.username if sender else c.sender_id,
            "elo": (sender.elo if sender else 1200),
            "tier": tier_for_elo(sender.elo if sender else 1200).key,
        },
        "recipient": {
            "user_id": c.recipient_id,
            "username": recipient.username if recipient else c.recipient_id,
            "elo": (recipient.elo if recipient else 1200),
            "tier": tier_for_elo(recipient.elo if recipient else 1200).key,
        },
        "problem_seed": json.loads(c.problem_seed_json or "[]"),
        "sender_steps_cleared": c.sender_steps_cleared,
        "recipient_steps_cleared": c.recipient_steps_cleared,
        "sender_duration_s": c.sender_duration_s,
        "recipient_duration_s": c.recipient_duration_s,
        "sender_started_at": c.sender_started_at.isoformat() if c.sender_started_at else None,
        "sender_finished_at": c.sender_finished_at.isoformat() if c.sender_finished_at else None,
        "recipient_started_at": c.recipient_started_at.isoformat() if c.recipient_started_at else None,
        "recipient_finished_at": c.recipient_finished_at.isoformat() if c.recipient_finished_at else None,
        "winner_id": c.winner_id,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
    }


@router.post("")
def create_challenge(
    body: CreateChallengeRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.cf_handle:
        raise HTTPException(status_code=400, detail="Link your CF handle first.")

    recipient = db.query(User).filter(User.username == body.recipient_username).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")
    if not recipient.cf_handle:
        raise HTTPException(status_code=400, detail="Recipient has no CF handle linked")

    # Generate 5-problem seed based on lower ELO
    base_elo = min(current_user.elo or 1200, recipient.elo or 1200)
    rounded = max(800, (base_elo // 100) * 100)
    targets = [rounded - 200, rounded - 100, rounded, rounded + 100, rounded + 200]

    pool = get_all_problems()
    if not pool:
        raise HTTPException(status_code=503, detail="Codeforces problemset unavailable")

    rng = random.Random()
    seed = []
    used: set[str] = set()
    for target in targets:
        candidates = [
            p
            for p in pool
            if abs(p.rating - target) <= 50 and p.problem_id not in used
        ]
        if not candidates:
            candidates = [
                p
                for p in pool
                if abs(p.rating - target) <= 150 and p.problem_id not in used
            ]
        if not candidates:
            raise HTTPException(status_code=503, detail="Problem pool too thin")
        p = rng.choice(candidates)
        seed.append(
            {
                "contest_id": p.contest_id,
                "index": p.index,
                "name": p.name,
                "rating": p.rating,
                "tags": p.tags,
                "problem_id": p.problem_id,
            }
        )
        used.add(p.problem_id)

    challenge = AsyncChallenge(
        id=str(uuid.uuid4()),
        sender_id=current_user.id,
        recipient_id=recipient.id,
        status="sent",
        problem_seed_json=json.dumps(seed),
        sender_started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=ACCEPT_DEADLINE_HOURS),
    )
    db.add(challenge)
    db.commit()
    return _serialize(challenge, db)


@router.get("/inbox")
def inbox(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    sent = (
        db.query(AsyncChallenge)
        .filter(AsyncChallenge.sender_id == current_user.id)
        .order_by(AsyncChallenge.created_at.desc())
        .limit(30)
        .all()
    )
    received = (
        db.query(AsyncChallenge)
        .filter(AsyncChallenge.recipient_id == current_user.id)
        .order_by(AsyncChallenge.created_at.desc())
        .limit(30)
        .all()
    )
    return {
        "sent": [_serialize(c, db) for c in sent],
        "received": [_serialize(c, db) for c in received],
    }


@router.post("/{cid}/accept")
def accept(
    cid: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    c = (
        db.query(AsyncChallenge)
        .filter(
            AsyncChallenge.id == cid,
            AsyncChallenge.recipient_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.status not in ("sent", "sender_done"):
        raise HTTPException(status_code=400, detail="Challenge not joinable")
    c.recipient_started_at = datetime.utcnow()
    c.status = "accepted"
    db.commit()
    return _serialize(c, db)


class SubmitResultsRequest(BaseModel):
    steps_cleared: int
    duration_s: int


@router.post("/{cid}/submit")
def submit_results(
    cid: str,
    body: SubmitResultsRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    """User self-reports their attempt result. Used after a 90-min window."""
    c = db.query(AsyncChallenge).filter(AsyncChallenge.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")

    is_sender = c.sender_id == current_user.id
    is_recipient = c.recipient_id == current_user.id
    if not is_sender and not is_recipient:
        raise HTTPException(status_code=403, detail="Not your challenge")

    cleared = max(0, min(5, int(body.steps_cleared)))
    dur = max(0, int(body.duration_s))

    if is_sender:
        c.sender_steps_cleared = cleared
        c.sender_duration_s = dur
        c.sender_finished_at = datetime.utcnow()
        if c.status in ("sent",):
            c.status = "sender_done"
    else:
        c.recipient_steps_cleared = cleared
        c.recipient_duration_s = dur
        c.recipient_finished_at = datetime.utcnow()

    # If both done, resolve winner
    if c.sender_finished_at and c.recipient_finished_at:
        if c.sender_steps_cleared > c.recipient_steps_cleared:
            c.winner_id = c.sender_id
        elif c.recipient_steps_cleared > c.sender_steps_cleared:
            c.winner_id = c.recipient_id
        elif c.sender_duration_s and c.recipient_duration_s:
            c.winner_id = (
                c.sender_id
                if c.sender_duration_s < c.recipient_duration_s
                else c.recipient_id
            )
        c.status = "complete"

    db.commit()
    return _serialize(c, db)
