#!/usr/bin/env python3
"""Diagnose CF sync for an active duel."""
from __future__ import annotations

import asyncio
import sys

from app.db import SessionLocal
from app.models import Duel, DuelStep, User
from app.services.cf_sync import duel_start_epoch, fetch_user_status, process_duel_cf, verify_cf_handle

DUEL_ID = sys.argv[1] if len(sys.argv) > 1 else "75940b36-2285-4eaa-b0ae-8ab5ac0b685e"
RUN_POLL = "--poll" in sys.argv


async def main() -> None:
    db = SessionLocal()
    try:
        duel = db.query(Duel).filter(Duel.id == DUEL_ID).first()
        if not duel:
            print(f"Duel {DUEL_ID} not found")
            return

        steps = (
            db.query(DuelStep)
            .filter(DuelStep.duel_id == duel.id)
            .order_by(DuelStep.step_index)
            .all()
        )
        start_ts = duel_start_epoch(duel)
        print(f"Duel {duel.id} status={duel.status} host_id={duel.host_id}")
        print(f"started_at={duel.started_at} start_epoch={start_ts}")

        step0 = steps[0] if steps else None
        if not step0:
            print("No steps")
            return

        print(
            f"Step 0: {step0.problem_contest_id}-{step0.problem_index} "
            f"host={step0.host_status} opp={step0.opponent_status}"
        )

        for part in duel.participants:
            user = db.query(User).filter(User.id == part.user_id).first()
            if not user or not user.cf_handle:
                print(f"  {user.username if user else part.user_id}: no cf_handle")
                continue
            valid, err = verify_cf_handle(user.cf_handle)
            print(f"\n--- {user.username} ({user.cf_handle}) valid={valid} ---")
            if err:
                print(f"  ERROR: {err}")
                continue
            subs, fetch_err = await fetch_user_status(user.cf_handle)
            if subs is None:
                print(f"  fetch failed: {fetch_err}")
                continue
            matched = 0
            for sub in subs:
                p = sub.get("problem") or {}
                if int(p.get("contestId", 0)) != int(step0.problem_contest_id):
                    continue
                if str(p.get("index")) != str(step0.problem_index):
                    continue
                ts = sub.get("creationTimeSeconds", 0)
                print(
                    f"  id={sub.get('id')} verdict={sub.get('verdict')} "
                    f"after_start={ts >= start_ts}"
                )
                matched += 1
            if matched == 0:
                print("  No submissions for step-0 problem in last 100.")

        if RUN_POLL:
            print("\n>>> Running process_duel_cf...")
            result = await process_duel_cf(db, duel, broadcast=False)
            print(result)
            db.refresh(step0)
            print(f"After: host={step0.host_status} opp={step0.opponent_status}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
