from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Iterable

from app.services.codeforces import CodeforcesService


@dataclass
class CandidateProblem:
    contest_id: int
    index: str
    name: str
    rating: int
    tags: list[str] = field(default_factory=list)

    @property
    def problem_id(self) -> str:
        return f"{self.contest_id}-{self.index}"


@dataclass
class _Cache:
    problems: list[CandidateProblem] = field(default_factory=list)
    fetched_at: float = 0.0


_PROBLEM_CACHE = _Cache()
_CACHE_TTL_SECONDS = 24 * 3600


def _refresh_cache() -> None:
    raw = CodeforcesService.fetch_problemset()
    out: list[CandidateProblem] = []
    for p in raw:
        d = p if isinstance(p, dict) else (p.model_dump() if hasattr(p, "model_dump") else dict(p))
        rating = d.get("rating")
        contest_id = d.get("contestId") or d.get("contest_id")
        index = d.get("index")
        if not rating or not contest_id or not index:
            continue
        out.append(
            CandidateProblem(
                contest_id=int(contest_id),
                index=str(index),
                name=str(d.get("name", "")),
                rating=int(rating),
                tags=[str(t) for t in (d.get("tags") or [])],
            )
        )
    _PROBLEM_CACHE.problems = out
    _PROBLEM_CACHE.fetched_at = time.time()


def get_all_problems() -> list[CandidateProblem]:
    if not _PROBLEM_CACHE.problems or (time.time() - _PROBLEM_CACHE.fetched_at) > _CACHE_TTL_SECONDS:
        try:
            _refresh_cache()
        except Exception:
            pass
    return _PROBLEM_CACHE.problems


def step_ratings_for_elo(base_elo: int) -> list[int]:
    rounded = max(800, (base_elo // 100) * 100)
    return [rounded - 200, rounded - 100, rounded, rounded + 100, rounded + 200]


def pick_ladder(
    base_elo: int,
    exclude_problem_ids: Iterable[str] = (),
    deck_tags: Iterable[str] = (),
    rng: random.Random | None = None,
) -> list[CandidateProblem]:
    rng = rng or random.Random()
    excluded = set(exclude_problem_ids)
    deck = {t.lower() for t in deck_tags}
    pool = get_all_problems()

    if not pool:
        raise ValueError("problem pool is empty (CF API may be unreachable)")

    chosen: list[CandidateProblem] = []
    used: set[str] = set()
    for target in step_ratings_for_elo(base_elo):
        candidates = [
            p
            for p in pool
            if abs(p.rating - target) <= 50
            and p.problem_id not in excluded
            and p.problem_id not in used
        ]
        if deck:
            tagged = [p for p in candidates if any(t.lower() in deck for t in p.tags)]
            if tagged:
                candidates = tagged
        if not candidates:
            candidates = [
                p
                for p in pool
                if abs(p.rating - target) <= 150
                and p.problem_id not in excluded
                and p.problem_id not in used
            ]
        if not candidates:
            raise ValueError(f"no problem available near rating {target}")
        choice = rng.choice(candidates)
        chosen.append(choice)
        used.add(choice.problem_id)
    return chosen
