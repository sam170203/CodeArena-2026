from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.models import Streak, User


@dataclass
class StreakTickResult:
    current_count: int
    longest_count: int
    broke: bool
    used_shield: bool
    incremented: bool


def _local_date(dt_utc: datetime, tz_name: str | None) -> str:
    """Return YYYY-MM-DD of dt_utc in the user's timezone (UTC fallback)."""
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    if tz_name:
        try:
            local = dt_utc.astimezone(ZoneInfo(tz_name))
        except ZoneInfoNotFoundError:
            local = dt_utc
    else:
        local = dt_utc
    return local.strftime("%Y-%m-%d")


def _days_between(a: str, b: str) -> int:
    da = datetime.strptime(a, "%Y-%m-%d").date()
    db = datetime.strptime(b, "%Y-%m-%d").date()
    return (db - da).days


def _get_or_create(db: Session, user_id: str, tz_name: str | None) -> Streak:
    row = db.query(Streak).filter(Streak.user_id == user_id).first()
    if row is None:
        row = Streak(user_id=user_id, timezone=tz_name)
        db.add(row)
        db.flush()
    elif tz_name and row.timezone != tz_name:
        row.timezone = tz_name
    return row


def tick_streak(db: Session, user: User, completion_dt_utc: datetime) -> StreakTickResult:
    """Update a user's streak after a duel completes."""
    tz_name = user.timezone
    today = _local_date(completion_dt_utc, tz_name)
    row = _get_or_create(db, user.id, tz_name)

    broke = False
    used_shield = False
    incremented = False

    if row.last_duel_local_date is None:
        row.current_count = 1
        incremented = True
    else:
        gap = _days_between(row.last_duel_local_date, today)
        if gap <= 0:
            # same-day or earlier (clock skew) -> nothing
            pass
        elif gap == 1:
            row.current_count = (row.current_count or 0) + 1
            incremented = True
        else:
            # missed days: each missed day consumes one shield. Need (gap-1) shields to keep alive.
            missed = gap - 1
            if (row.shields_remaining or 0) >= missed:
                row.shields_remaining = row.shields_remaining - missed
                used_shield = True
                row.current_count = (row.current_count or 0) + 1
                incremented = True
            else:
                broke = True
                row.current_count = 1

    if row.current_count > (row.longest_count or 0):
        row.longest_count = row.current_count

    # First-time hitting 7-day streak grants 1 shield (idempotent: only the
    # exact transition into 7 awards the shield, not every day after).
    if incremented and row.current_count == 7:
        row.shields_remaining = (row.shields_remaining or 0) + 1

    row.last_duel_local_date = today

    return StreakTickResult(
        current_count=row.current_count,
        longest_count=row.longest_count,
        broke=broke,
        used_shield=used_shield,
        incremented=incremented,
    )
