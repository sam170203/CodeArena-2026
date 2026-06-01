from datetime import datetime

from app.models import Duel, DuelParticipant
from app.services.cf_sync import duel_start_epoch as _duel_start_epoch
from app.services.duel_roles import host_and_opponent, is_duel_host


def test_duel_start_epoch_treats_naive_started_at_as_utc():
    duel = Duel(
        host_id="host",
        started_at=datetime(2026, 1, 15, 12, 0, 0),
    )
    assert _duel_start_epoch(duel) == 1768478400


def test_host_and_opponent_uses_duel_host_id_not_join_order():
    duel = Duel(host_id="real-host")
    participants = [
        DuelParticipant(duel_id="d1", user_id="joiner", joined_at=datetime(2026, 1, 1, 0, 0, 0)),
        DuelParticipant(duel_id="d1", user_id="real-host", joined_at=datetime(2026, 1, 1, 0, 0, 1)),
    ]
    host, opp = host_and_opponent(duel, participants)
    assert host is not None and host.user_id == "real-host"
    assert opp is not None and opp.user_id == "joiner"
    assert is_duel_host(duel, "real-host")
    assert not is_duel_host(duel, "joiner")
