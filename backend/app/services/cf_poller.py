from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Duel, DuelParticipant, DuelStep, ReplayEvent, User
from app.services.duel_completion import complete_duel
from app.services.ws_hub import hub

log = logging.getLogger("cf_poller")

TICK_SECONDS = 3.0
PER_HANDLE_MIN_INTERVAL = 1.1  # CF rate limit safety
BACKOFF_INITIAL = 5.0
BACKOFF_MAX = 60.0

_last_seen_submission: dict[str, int] = {}
_last_call: dict[str, float] = {}
_backoff_until: dict[str, float] = {}

CF_VERDICT_MAP = {
    "OK": "AC",
    "WRONG_ANSWER": "WA",
    "TIME_LIMIT_EXCEEDED": "TLE",
    "MEMORY_LIMIT_EXCEEDED": "MLE",
    "RUNTIME_ERROR": "RE",
    "COMPILATION_ERROR": "CE",
    "TESTING": "RUNNING",
    "SKIPPED": "RE",
    "REJECTED": "RE",
    "PARTIAL": "WA",
    "PRESENTATION_ERROR": "WA",
    "IDLENESS_LIMIT_EXCEEDED": "TLE",
    "SECURITY_VIOLATED": "RE",
    "CRASHED": "RE",
    "INPUT_PREPARATION_CRASHED": "RE",
    "CHALLENGED": "WA",
    "FAILED": "WA",
}


async def _fetch_status(handle: str) -> Optional[list[dict]]:
    now = time.time()
    if now < _backoff_until.get(handle, 0):
        return None
    if now - _last_call.get(handle, 0) < PER_HANDLE_MIN_INTERVAL:
        return None
    url = f"https://codeforces.com/api/user.status?handle={handle}&from=1&count=10"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
        _last_call[handle] = time.time()
        if r.status_code != 200:
            current = max(BACKOFF_INITIAL, _backoff_until.get(handle, 0) - time.time())
            _backoff_until[handle] = time.time() + min(BACKOFF_MAX, current * 2)
            return None
        data = r.json()
        if data.get("status") != "OK":
            return None
        _backoff_until[handle] = 0
        return data.get("result", [])
    except Exception:
        log.exception("cf fetch failed for %s", handle)
        _backoff_until[handle] = time.time() + 10
        return None


def _current_step(db: Session, duel: Duel, user_id: str) -> Optional[DuelStep]:
    parts = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )
    if len(parts) != 2:
        return None
    is_host = parts[0].user_id == user_id
    steps = (
        db.query(DuelStep)
        .filter(DuelStep.duel_id == duel.id)
        .order_by(DuelStep.step_index.asc())
        .all()
    )
    for s in steps:
        status = s.host_status if is_host else s.opponent_status
        if status == "pending":
            return s
    return None


async def _process_duel(db: Session, duel: Duel) -> None:
    parts = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )
    if len(parts) != 2:
        return
    duel_start_ts = (
        int(duel.started_at.timestamp()) if duel.started_at else int(time.time())
    )

    steps_total = db.query(DuelStep).filter(DuelStep.duel_id == duel.id).count()

    for idx, part in enumerate(parts):
        user = db.query(User).filter(User.id == part.user_id).first()
        if not user or not user.cf_handle:
            continue
        current = _current_step(db, duel, user.id)
        if not current:
            continue

        submissions = await _fetch_status(user.cf_handle)
        if submissions is None:
            continue

        # iterate from oldest of returned to newest
        for sub in reversed(submissions):
            sub_id = sub.get("id")
            if not sub_id:
                continue
            cache_key = f"{user.cf_handle}:{duel.id}"
            if sub_id <= _last_seen_submission.get(cache_key, 0):
                continue
            if sub.get("creationTimeSeconds", 0) < duel_start_ts:
                continue

            problem = sub.get("problem") or {}
            if problem.get("contestId") != current.problem_contest_id:
                continue
            if str(problem.get("index")) != str(current.problem_index):
                continue

            cf_verdict = sub.get("verdict") or "TESTING"
            mapped = CF_VERDICT_MAP.get(cf_verdict, "RUNNING")
            testset = sub.get("passedTestCount")

            verdict_payload = {
                "user_id": user.id,
                "step_index": current.step_index,
                "verdict": mapped,
                "testset": testset,
                "submission_id": sub_id,
            }
            await hub.broadcast("duel", duel.id, {"type": "verdict", "payload": verdict_payload})

            ts_offset_ms = int((time.time() - duel_start_ts) * 1000)
            db.add(
                ReplayEvent(
                    duel_id=duel.id,
                    ts_offset_ms=ts_offset_ms,
                    user_id=user.id,
                    event_type="verdict",
                    payload_json=json.dumps(verdict_payload),
                )
            )
            db.commit()

            _last_seen_submission[cache_key] = sub_id

            if mapped == "AC":
                is_host = idx == 0
                if is_host:
                    current.host_status = "solved"
                    current.host_solved_at = datetime.utcnow()
                else:
                    current.opponent_status = "solved"
                    current.opponent_solved_at = datetime.utcnow()
                db.commit()

                next_idx = current.step_index + 1
                advance_payload = {"user_id": user.id, "new_step_index": next_idx}
                await hub.broadcast("duel", duel.id, {"type": "step_advance", "payload": advance_payload})
                db.add(
                    ReplayEvent(
                        duel_id=duel.id,
                        ts_offset_ms=int((time.time() - duel_start_ts) * 1000),
                        user_id=user.id,
                        event_type="step_advance",
                        payload_json=json.dumps(advance_payload),
                    )
                )
                db.commit()

                if next_idx >= steps_total:
                    await complete_duel(db, duel, winner_user_id=user.id)
                    return


async def run_cf_poller_loop() -> None:
    log.info("cf_poller loop started")
    while True:
        db: Session = next(get_db())
        try:
            duels = db.query(Duel).filter(Duel.status == "active").all()
            for d in duels:
                try:
                    await _process_duel(db, d)
                except Exception:
                    log.exception("error processing duel %s", d.id)
        except Exception:
            log.exception("cf_poller tick error")
        finally:
            db.close()
        await asyncio.sleep(TICK_SECONDS)
