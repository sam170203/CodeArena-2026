from __future__ import annotations

import asyncio
import logging

from app.db import get_db
from app.models import Duel
from app.services.cf_sync import process_duel_cf

log = logging.getLogger("cf_poller")

TICK_SECONDS = 3.0


async def run_cf_poller_loop() -> None:
    log.info("cf_poller loop started")
    while True:
        db = next(get_db())
        try:
            duels = db.query(Duel).filter(Duel.status == "active").all()
            for d in duels:
                try:
                    await process_duel_cf(db, d, broadcast=True)
                except Exception:
                    log.exception("error processing duel %s", d.id)
        except Exception:
            log.exception("cf_poller tick error")
        finally:
            db.close()
        await asyncio.sleep(TICK_SECONDS)
