from __future__ import annotations

import json
import time
import uuid
from collections import deque
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import MatchmakingQueueEntry, User
from app.schemas import EnqueueRequest, EnqueueResponse
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/matchmaking", tags=["matchmaking"])

# Per-user enqueue rate limiter: max 3 enqueues per 120s window.
_enqueue_history: dict[str, deque] = {}
_ENQUEUE_WINDOW_S = 120
_ENQUEUE_MAX = 3


def _check_rate_limit(user_id: str) -> bool:
    now = time.time()
    dq = _enqueue_history.setdefault(user_id, deque())
    while dq and now - dq[0] > _ENQUEUE_WINDOW_S:
        dq.popleft()
    if len(dq) >= _ENQUEUE_MAX:
        return False
    dq.append(now)
    return True


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

    if not _check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=429,
            detail="Too many queue enqueues. Take a breath, then try again.",
        )

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
