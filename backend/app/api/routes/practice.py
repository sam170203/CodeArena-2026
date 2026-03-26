from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SolvedProblem, User
from app.schemas import PracticeResponse
from app.services.codeforces import CodeforcesService

router = APIRouter(prefix="/practice", tags=["practice"])


def _normalize_problem(problem: Any) -> dict:
    if hasattr(problem, "model_dump"):
        problem = problem.model_dump()

    return {
        "contest_id": problem.get("contestId", problem.get("contest_id")),
        "index": problem.get("index"),
        "name": problem.get("name"),
        "rating": problem.get("rating"),
        "tags": problem.get("tags") or [],
        "time_limit": problem.get("timeLimit", problem.get("time_limit")),
        "memory_limit": problem.get("memoryLimit", problem.get("memory_limit")),
    }


@router.get("/div2", response_model=PracticeResponse)
def get_div2_problems():
    problems = CodeforcesService.generate_practice(rating=1600, count=60)
    return {"problems": [_normalize_problem(p) for p in problems]}


@router.get("/div3", response_model=PracticeResponse)
def get_div3_problems():
    problems = CodeforcesService.generate_practice(rating=1100, count=60)
    return {"problems": [_normalize_problem(p) for p in problems]}


@router.get("/generate", response_model=PracticeResponse)
def generate_practice(
    rating: int = Query(default=1200, ge=800, le=3500),
    count: int = Query(default=5, ge=1, le=50),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags"),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    problems = CodeforcesService.generate_practice(rating, count, tag_list)
    return {"problems": [_normalize_problem(p) for p in problems]}


@router.get("/user/{user_id}", response_model=PracticeResponse)
def get_practice(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"problems": []}

    problems = CodeforcesService.fetch_problemset()

    solved = db.query(SolvedProblem).filter(
        SolvedProblem.user_id == user_id
    ).all()

    solved_set = set((p.contest_id, p.problem_index) for p in solved)

    target_rating = user.cf_rating or 1200

    filtered = [
        p for p in problems
        if p.get("rating") is not None
        and (target_rating - 200 <= p["rating"] <= target_rating + 200)
        and (p.get("contestId"), p.get("index")) not in solved_set
    ]

    filtered.sort(key=lambda x: x.get("rating", 0))

    result = [_normalize_problem(p) for p in filtered[:20]]
    return {"problems": result}