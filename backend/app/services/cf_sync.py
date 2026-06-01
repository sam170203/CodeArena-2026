from __future__ import annotations

import calendar
import json
import logging
import time
from datetime import datetime
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session

from app.models import Duel, DuelParticipant, DuelStep, ReplayEvent, User
from app.services.codeforces import CodeforcesService
from app.services.duel_completion import complete_duel
from app.services.duel_roles import is_duel_host
from app.services.ws_hub import hub

log = logging.getLogger("cf_sync")

CF_FETCH_COUNT = 100
PER_HANDLE_MIN_INTERVAL = 1.0
_last_call: dict[str, float] = {}
_last_seen_submission: dict[str, int] = {}
_handle_valid_cache: dict[str, tuple[bool, str, float]] = {}

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


def duel_start_epoch(duel: Duel) -> int:
    if not duel.started_at:
        return int(time.time())
    dt = duel.started_at
    if dt.tzinfo is not None:
        return int(dt.timestamp())
    return calendar.timegm(dt.timetuple())


def verify_cf_handle(handle: str) -> tuple[bool, Optional[str]]:
    handle = (handle or "").strip()
    if not handle:
        return False, "Handle is empty"

    cached = _handle_valid_cache.get(handle.lower())
    if cached and cached[2] > time.time():
        return cached[0], cached[1] or None

    info = CodeforcesService.fetch_user_rating(handle)
    if info is None:
        msg = f"Codeforces handle '{handle}' not found"
        _handle_valid_cache[handle.lower()] = (False, msg, time.time() + 300)
        return False, msg

    _handle_valid_cache[handle.lower()] = (True, "", time.time() + 600)
    return True, None


def _submission_matches_step(sub: dict[str, Any], step: DuelStep) -> bool:
    problem = sub.get("problem") or {}
    try:
        contest_id = int(problem.get("contestId"))
    except (TypeError, ValueError):
        return False
    if contest_id != int(step.problem_contest_id):
        return False
    return str(problem.get("index")) == str(step.problem_index)


def _current_step(db: Session, duel: Duel, user_id: str) -> Optional[DuelStep]:
    parts = db.query(DuelParticipant).filter(DuelParticipant.duel_id == duel.id).all()
    if len(parts) != 2:
        return None
    is_host = is_duel_host(duel, user_id)
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


async def fetch_user_status(handle: str) -> tuple[Optional[list[dict]], Optional[str]]:
    handle = (handle or "").strip()
    valid, err = verify_cf_handle(handle)
    if not valid:
        return None, err

    now = time.time()
    if now - _last_call.get(handle, 0) < PER_HANDLE_MIN_INTERVAL:
        return None, None

    url = (
        "https://codeforces.com/api/user.status"
        f"?handle={handle}&from=1&count={CF_FETCH_COUNT}"
    )
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(url)
        _last_call[handle] = time.time()
        data = r.json()
        if data.get("status") != "OK":
            comment = data.get("comment") or "Codeforces API error"
            return None, comment
        return data.get("result", []), None
    except Exception:
        log.exception("CF user.status failed for %s", handle)
        return None, "Could not reach Codeforces API"


async def process_duel_cf(db: Session, duel: Duel, *, broadcast: bool = True) -> dict[str, Any]:
    """Poll CF for both players; update steps and broadcast WS events."""
    if duel.status != "active":
        return {"ok": False, "reason": "duel_not_active"}

    parts = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .all()
    )
    if len(parts) != 2:
        return {"ok": False, "reason": "need_two_participants"}

    duel_start_ts = duel_start_epoch(duel)
    steps_total = db.query(DuelStep).filter(DuelStep.duel_id == duel.id).count()
    sync_info: dict[str, Any] = {"players": {}}

    for part in parts:
        user = db.query(User).filter(User.id == part.user_id).first()
        if not user:
            continue

        handle = (user.cf_handle or "").strip()
        player_info: dict[str, Any] = {
            "user_id": user.id,
            "cf_handle": handle,
            "cf_valid": False,
            "cf_error": None,
            "updated": False,
        }

        if not handle:
            player_info["cf_error"] = "No Codeforces handle linked"
            sync_info["players"][user.id] = player_info
            continue

        valid, err = verify_cf_handle(handle)
        player_info["cf_valid"] = valid
        player_info["cf_error"] = err
        if not valid:
            sync_info["players"][user.id] = player_info
            continue

        current = _current_step(db, duel, user.id)
        if not current:
            sync_info["players"][user.id] = player_info
            continue

        submissions, fetch_err = await fetch_user_status(handle)
        if submissions is None:
            if fetch_err:
                player_info["cf_error"] = fetch_err
            sync_info["players"][user.id] = player_info
            continue

        cache_key = f"{handle}:{duel.id}"
        is_host = is_duel_host(duel, user.id)

        # 1) Apply any AC on the current step (even if we already saw older WAs).
        for sub in submissions:
            if not _submission_matches_step(sub, current):
                continue
            if sub.get("creationTimeSeconds", 0) < duel_start_ts:
                continue
            if (sub.get("verdict") or "") != "OK":
                continue

            side_status = current.host_status if is_host else current.opponent_status
            if side_status == "solved":
                break

            if is_host:
                current.host_status = "solved"
                current.host_solved_at = datetime.utcnow()
            else:
                current.opponent_status = "solved"
                current.opponent_solved_at = datetime.utcnow()
            db.commit()
            player_info["updated"] = True

            sub_id = sub.get("id")
            if sub_id:
                _last_seen_submission[cache_key] = max(
                    _last_seen_submission.get(cache_key, 0), int(sub_id)
                )

            next_idx = current.step_index + 1
            advance_payload = {"user_id": user.id, "new_step_index": next_idx}
            if broadcast:
                await hub.broadcast(
                    "duel", duel.id, {"type": "step_advance", "payload": advance_payload}
                )
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
                sync_info["players"][user.id] = player_info
                sync_info["ok"] = True
                return sync_info

            current = _current_step(db, duel, user.id)
            if not current:
                break

        # 2) Broadcast verdicts for new submissions on the current step.
        for sub in reversed(submissions):
            sub_id = sub.get("id")
            if not sub_id:
                continue
            if sub_id <= _last_seen_submission.get(cache_key, 0):
                continue
            if sub.get("creationTimeSeconds", 0) < duel_start_ts:
                continue
            if not current or not _submission_matches_step(sub, current):
                continue

            cf_verdict = sub.get("verdict") or "TESTING"
            mapped = CF_VERDICT_MAP.get(cf_verdict, "RUNNING")
            verdict_payload = {
                "user_id": user.id,
                "step_index": current.step_index,
                "verdict": mapped,
                "testset": sub.get("passedTestCount"),
                "submission_id": sub_id,
            }
            if broadcast:
                await hub.broadcast(
                    "duel", duel.id, {"type": "verdict", "payload": verdict_payload}
                )
            db.add(
                ReplayEvent(
                    duel_id=duel.id,
                    ts_offset_ms=int((time.time() - duel_start_ts) * 1000),
                    user_id=user.id,
                    event_type="verdict",
                    payload_json=json.dumps(verdict_payload),
                )
            )
            db.commit()
            _last_seen_submission[cache_key] = int(sub_id)
            player_info["updated"] = True

            if mapped == "AC":
                break

        sync_info["players"][user.id] = player_info

    sync_info["ok"] = True
    return sync_info
