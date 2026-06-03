from __future__ import annotations

from app.models import Duel, DuelParticipant


def is_duel_host(duel: Duel, user_id: str) -> bool:
    return duel.host_id == user_id


def host_and_opponent(
    duel: Duel, participants: list[DuelParticipant]
) -> tuple[DuelParticipant | None, DuelParticipant | None]:
    """Resolve host/opponent rows by duel.host_id, not join order."""
    host = next((p for p in participants if p.user_id == duel.host_id), None)
    opponent = next((p for p in participants if p.user_id != duel.host_id), None)
    return host, opponent
