from dataclasses import dataclass
from typing import Literal

DuelResult = Literal["win", "loss", "draw"]


@dataclass(frozen=True)
class Tier:
    key: str
    min_elo: int
    max_elo: int
    k_factor: int


TIERS = (
    Tier("BRONZE",   0,    999,   40),
    Tier("SILVER",   1000, 1299,  40),
    Tier("GOLD",     1300, 1599,  32),
    Tier("PLATINUM", 1600, 1899,  32),
    Tier("DIAMOND",  1900, 2199,  24),
    Tier("MASTER",   2200, 2499,  16),
    Tier("LEGEND",   2500, 99999, 16),
)


def tier_for_elo(elo: int) -> Tier:
    for t in TIERS:
        if t.min_elo <= elo <= t.max_elo:
            return t
    return TIERS[0]


def expected_score(my_elo: int, opp_elo: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opp_elo - my_elo) / 400.0))


def elo_delta(my_elo: int, opp_elo: int, result: DuelResult) -> int:
    k = tier_for_elo(my_elo).k_factor
    actual = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
    return round(k * (actual - expected_score(my_elo, opp_elo)))


def apply_delta(current: int, delta: int) -> int:
    return max(0, current + delta)
