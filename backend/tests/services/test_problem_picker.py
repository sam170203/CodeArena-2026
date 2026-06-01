import random

from app.services import problem_picker
from app.services.problem_picker import (
    CandidateProblem,
    pick_ladder,
    step_ratings_for_elo,
)


def _stub_pool() -> list[CandidateProblem]:
    pool: list[CandidateProblem] = []
    for rating in range(800, 3001, 100):
        for variant in range(8):
            pool.append(
                CandidateProblem(
                    contest_id=1000 + rating + variant,
                    index=chr(ord("A") + (variant % 6)),
                    name=f"problem-{rating}-{variant}",
                    rating=rating,
                    tags=["dp"] if variant % 2 == 0 else ["graphs"],
                )
            )
    return pool


def test_step_ratings_for_elo_1500():
    assert step_ratings_for_elo(1500) == [1300, 1400, 1500, 1600, 1700]


def test_step_ratings_clamped_low():
    # for base 700 → rounded becomes 800 (max(800, ...))
    assert step_ratings_for_elo(700)[0] >= 600


def test_pick_ladder_returns_5_distinct(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    rng = random.Random(42)
    chosen = pick_ladder(1500, rng=rng)
    assert len(chosen) == 5
    ids = [p.problem_id for p in chosen]
    assert len(set(ids)) == 5


def test_pick_ladder_respects_excludes(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    excludes = {p.problem_id for p in pool if p.rating == 1500 and "dp" in p.tags}
    rng = random.Random(7)
    chosen = pick_ladder(1500, exclude_problem_ids=excludes, rng=rng)
    step_1500 = chosen[2]
    assert step_1500.problem_id not in excludes


def test_pick_ladder_prefers_deck_tags(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    rng = random.Random(1)
    chosen = pick_ladder(1500, deck_tags=["dp"], rng=rng)
    for p in chosen:
        assert "dp" in p.tags
