from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WSHub:
    """Subscription registry keyed by (channel_kind, channel_id)."""

    def __init__(self) -> None:
        self._subscribers: dict[tuple[str, str], set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, kind: str, ident: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers[(kind, ident)].add(ws)

    async def unsubscribe(self, kind: str, ident: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers[(kind, ident)].discard(ws)
            if not self._subscribers[(kind, ident)]:
                self._subscribers.pop((kind, ident), None)

    async def broadcast(self, kind: str, ident: str, message: dict[str, Any]) -> None:
        text = json.dumps(message, default=str)
        async with self._lock:
            sockets = list(self._subscribers.get((kind, ident), ()))
        for ws in sockets:
            try:
                await ws.send_text(text)
            except Exception:
                # client will be cleaned up on its own onclose path
                pass


hub = WSHub()
