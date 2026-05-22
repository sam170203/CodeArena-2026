from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import MatchmakingQueueEntry, User
from app.schemas import EnqueueRequest, EnqueueResponse
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/matchmaking", tags=["matchmaking"])


@router.post("/enqueue", response_model=EnqueueResponse)
def enqueue(
    payload: EnqueueRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.cf_handle:
        raise HTTPException(
            status_code=400, detail="Link your Codeforces handle to play."
        )

    existing = (
        db.query(MatchmakingQueueEntry)
        .filter(MatchmakingQueueEntry.user_id == current_user.id)
        .first()
    )
    if existing:
        return EnqueueResponse(queue_id=existing.id, eta_seconds=30)

    entry = MatchmakingQueueEntry(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        mode=payload.mode,
        elo_at_enqueue=current_user.elo or 1200,
        deck_tags_json=json.dumps(payload.deck_tags or []),
        enqueued_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(entry)
    db.commit()
    return EnqueueResponse(queue_id=entry.id, eta_seconds=30)


@router.delete("/queue/{queue_id}")
def cancel(
    queue_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(MatchmakingQueueEntry)
        .filter(
            MatchmakingQueueEntry.id == queue_id,
            MatchmakingQueueEntry.user_id == current_user.id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
