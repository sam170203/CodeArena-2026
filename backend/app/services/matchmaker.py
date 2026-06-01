from __future__ import annotations

import asyncio
import json
import logging
import random
from datetime import datetime

from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Deck, Duel, DuelParticipant, DuelStep, MatchmakingQueueEntry, User
from app.services.problem_picker import pick_ladder
from app.services.ws_hub import hub
from app.services.elo import tier_for_elo

log = logging.getLogger("matchmaker")

TICK_SECONDS = 1.0
INITIAL_WINDOW = 150
WIDEN_WINDOWS = [(60, 300), (120, 500)]  # (seconds_in_queue, window)


def _window_for(entry: MatchmakingQueueEntry) -> int:
    age = (datetime.utcnow() - entry.enqueued_at).total_seconds()
    window = INITIAL_WINDOW
    for threshold, w in WIDEN_WINDOWS:
        if age >= threshold:
            window = w
    return window


def _find_match(db: Session, entry: MatchmakingQueueEntry) -> MatchmakingQueueEntry | None:
    window = _window_for(entry)
    return (
        db.query(MatchmakingQueueEntry)
        .filter(
            MatchmakingQueueEntry.id != entry.id,
            MatchmakingQueueEntry.mode == entry.mode,
            MatchmakingQueueEntry.elo_at_enqueue.between(
                entry.elo_at_enqueue - window,
                entry.elo_at_enqueue + window,
            ),
        )
        .order_by(MatchmakingQueueEntry.enqueued_at.asc())
        .first()
    )


def _start_duel(db: Session, host: MatchmakingQueueEntry, opp: MatchmakingQueueEntry) -> Duel:
    host_user = db.query(User).filter(User.id == host.user_id).first()
    opp_user = db.query(User).filter(User.id == opp.user_id).first()
    if host_user is None or opp_user is None:
        raise RuntimeError("user vanished mid-match")

    base_elo = min(host_user.elo or 1200, opp_user.elo or 1200)

    # Per-queue deck overrides take priority; otherwise pull saved decks.
    deck: list[str] = []
    try:
        if host.deck_tags_json:
            deck += json.loads(host.deck_tags_json) or []
        if opp.deck_tags_json:
            deck += json.loads(opp.deck_tags_json) or []
    except Exception:
        deck = []

    if not deck:
        for uid in (host.user_id, opp.user_id):
            saved = db.query(Deck).filter(Deck.user_id == uid).first()
            if saved and saved.tags_json:
                try:
                    deck += json.loads(saved.tags_json) or []
                except Exception:
                    pass

    problems = pick_ladder(base_elo, deck_tags=deck, rng=random.Random())

    duel = Duel(
        host_id=host.user_id,
        format="speedrun_ladder",
        max_participants=2,
        rating_target=base_elo,
        status="active",
        started_at=datetime.utcnow(),
        problem_id=problems[2].problem_id,
        problem_name=problems[2].name,
        problem_rating=problems[2].rating,
        time_cap_seconds=2700,
    )
    db.add(duel)
    db.flush()

    db.add(DuelParticipant(duel_id=duel.id, user_id=host.user_id, current_rating=host_user.elo or 1200))
    db.add(DuelParticipant(duel_id=duel.id, user_id=opp.user_id, current_rating=opp_user.elo or 1200))

    for idx, p in enumerate(problems):
        db.add(
            DuelStep(
                duel_id=duel.id,
                step_index=idx,
                rating=p.rating,
                problem_id=p.problem_id,
                problem_contest_id=p.contest_id,
                problem_index=p.index,
                problem_name=p.name,
                problem_tags_json=json.dumps(p.tags),
            )
        )

    db.delete(host)
    db.delete(opp)
    db.commit()
    return duel


async def _tick() -> None:
    db: Session = next(get_db())
    try:
        entries = (
            db.query(MatchmakingQueueEntry)
            .order_by(MatchmakingQueueEntry.enqueued_at.asc())
            .all()
        )
        paired: set[str] = set()
        for entry in entries:
            if entry.id in paired:
                continue
            opp = _find_match(db, entry)
            if not opp or opp.id in paired:
                continue
            try:
                duel = _start_duel(db, entry, opp)
            except Exception:
                log.exception("failed to start duel")
                db.rollback()
                continue

            paired.add(entry.id)
            paired.add(opp.id)

            entry_user_id = entry.user_id
            opp_user_id = opp.user_id

            for user_id, other_id in (
                (entry_user_id, opp_user_id),
                (opp_user_id, entry_user_id),
            ):
                other = db.query(User).filter(User.id == other_id).first()
                other_elo = (other.elo if other else 1200) or 1200
                await hub.broadcast(
                    "queue",
                    user_id,
                    {
                        "type": "match_found",
                        "payload": {
                            "duel_id": duel.id,
                            "opponent": {
                                "user_id": other.id if other else other_id,
                                "username": other.username if other else other_id,
                                "handle": other.cf_handle if other else None,
                                "elo": other_elo,
                                "tier": tier_for_elo(other_elo).key,
                            },
                        },
                    },
                )
    finally:
        db.close()


async def _broadcast_queue_ticks() -> None:
    """Send queue_tick events to every queued user every 2 seconds."""
    db: Session = next(get_db())
    try:
        entries = db.query(MatchmakingQueueEntry).all()
        total = len(entries)
        for entry in entries:
            age = int((datetime.utcnow() - entry.enqueued_at).total_seconds())
            eta = max(5, 30 - age)
            await hub.broadcast(
                "queue",
                entry.user_id,
                {
                    "type": "queue_tick",
                    "payload": {"eta_seconds": eta, "queued_count": total},
                },
            )
    finally:
        db.close()


async def run_matchmaker_loop() -> None:
    log.info("matchmaker loop started")
    tick_count = 0
    while True:
        try:
            await _tick()
            if tick_count % 2 == 0:
                await _broadcast_queue_ticks()
        except Exception:
            log.exception("matchmaker tick error")
        tick_count += 1
        await asyncio.sleep(TICK_SECONDS)
