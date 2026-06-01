from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Quest, QuestProgress, User
from app.services.quests import roll_today_for
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/quests", tags=["quests"])


def _serialize(progress: QuestProgress, quest: Quest) -> dict:
    try:
        prog = json.loads(progress.progress_json or "{}")
    except Exception:
        prog = {}
    try:
        rule = json.loads(quest.rule_json or "{}")
    except Exception:
        rule = {}
    return {
        "id": progress.id,
        "slug": quest.slug,
        "title": quest.title_template,
        "kind": quest.kind,
        "rule": rule,
        "xp_reward": quest.xp_reward,
        "shard_reward": quest.shard_reward,
        "shield_reward": quest.shield_reward,
        "progress": prog,
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
        "claimed_at": progress.claimed_at.isoformat() if progress.claimed_at else None,
    }


@router.get("/today")
def today(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    rolled = roll_today_for(db, current_user)
    out = {"daily": [], "weekly": []}
    for p in rolled.daily:
        q = db.query(Quest).filter(Quest.id == p.quest_id).first()
        if q:
            out["daily"].append(_serialize(p, q))
    for p in rolled.weekly:
        q = db.query(Quest).filter(Quest.id == p.quest_id).first()
        if q:
            out["weekly"].append(_serialize(p, q))
    return out


@router.post("/{progress_id}/claim")
def claim(
    progress_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(QuestProgress)
        .filter(
            QuestProgress.id == progress_id,
            QuestProgress.user_id == current_user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Quest progress not found")
    if row.claimed_at is not None:
        raise HTTPException(status_code=400, detail="Already claimed")
    if row.completed_at is None:
        raise HTTPException(status_code=400, detail="Quest not yet completed")

    quest = db.query(Quest).filter(Quest.id == row.quest_id).first()
    if not quest:
        raise HTTPException(status_code=500, detail="Quest missing")

    current_user.xp = (current_user.xp or 0) + (quest.xp_reward or 0)
    if quest.shield_reward:
        from app.models import Streak
        streak = db.query(Streak).filter(Streak.user_id == current_user.id).first()
        if streak:
            streak.shields_remaining = (streak.shields_remaining or 0) + quest.shield_reward

    row.claimed_at = datetime.utcnow()
    db.commit()
    return {
        "claimed": True,
        "xp_awarded": quest.xp_reward,
        "shields_awarded": quest.shield_reward,
    }
