from __future__ import annotations

import time
from collections import deque

# Per-user emote rate limiter: max 4 emotes per 60s window.
_user_emote_times: dict[str, deque] = {}

ALLOWED_GLYPHS = {"gg", "salt", "thinking", "coffee", "fire", "exclaim"}

WINDOW_SECONDS = 60
MAX_PER_WINDOW = 4


def check_and_record(user_id: str) -> bool:
    """Return True if the user may emote now; records the timestamp if so."""
    now = time.time()
    dq = _user_emote_times.setdefault(user_id, deque())
    # drop expired
    while dq and now - dq[0] > WINDOW_SECONDS:
        dq.popleft()
    if len(dq) >= MAX_PER_WINDOW:
        return False
    dq.append(now)
    return True


def valid_glyph(glyph: str) -> bool:
    return glyph in ALLOWED_GLYPHS
