from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def top(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    rows = (
        db.query(User)
        .order_by(User.elo.desc())
        .offset(offset)
        .limit(min(max(limit, 1), 200))
        .all()
    )
    return [
        {
            "rank": offset + i + 1,
            "user_id": u.id,
            "username": u.username,
            "cf_handle": u.cf_handle,
            "elo": u.elo or 1200,
            "duel_wins": u.duel_wins or 0,
            "duel_losses": u.duel_losses or 0,
        }
        for i, u in enumerate(rows)
    ]
