from datetime import datetime
import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import PracticeSheetItem, SolvedProblem, User
from app.schemas import PracticeResponse
from app.services.codeforces import CodeforcesService

router = APIRouter(prefix="/practice", tags=["practice"])


def _problem_get(problem: Any, key: str, default=None):
    if problem is None:
        return default

    if isinstance(problem, dict):
        return problem.get(key, default)

    return getattr(problem, key, default)


def _problem_key(contest_id, index) -> str:
    return f"{contest_id}-{index}"


def _normalize_tags(tags_value: Any) -> list[str]:
    if tags_value is None:
        return []

    if isinstance(tags_value, list):
        return [str(t).strip() for t in tags_value if str(t).strip()]

    if isinstance(tags_value, str):
        text = tags_value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(t).strip() for t in parsed if str(t).strip()]
        except Exception:
            pass
        return [t.strip() for t in text.split(",") if t.strip()]

    return []


def _normalize_problem(problem: Any) -> dict:
    contest_id = _problem_get(problem, "contest_id", _problem_get(problem, "contestId"))
    index = _problem_get(problem, "index", _problem_get(problem, "problem_index"))
    name = _problem_get(problem, "name", _problem_get(problem, "problem_name"))
    rating = _problem_get(problem, "rating")
    time_limit = _problem_get(problem, "time_limit", _problem_get(problem, "timeLimit"))
    memory_limit = _problem_get(problem, "memory_limit", _problem_get(problem, "memoryLimit"))

    tags = _problem_get(problem, "tags")
    if tags is None:
        tags = _problem_get(problem, "tags_json")
    tags = _normalize_tags(tags)

    problem_id = _problem_get(problem, "problem_id")
    if not problem_id and contest_id is not None and index is not None:
        problem_id = f"{contest_id}-{index}"

    status = _problem_get(problem, "status", "new")
    is_active = _problem_get(problem, "is_active", True)
    first_seen_at = _problem_get(problem, "first_seen_at")
    last_seen_at = _problem_get(problem, "last_seen_at")

    return {
        "problem_id": problem_id,
        "contest_id": contest_id,
        "index": index,
        "name": name,
        "rating": rating,
        "tags": tags,
        "time_limit": time_limit,
        "memory_limit": memory_limit,
        "status": status,
        "is_active": bool(is_active),
        "first_seen_at": first_seen_at,
        "last_seen_at": last_seen_at,
    }


def _sheet_signature(sheet_type: str, user_id: str, tags: Optional[list[str]] = None) -> str:
    tag_sig = ",".join(sorted([t.strip().lower() for t in (tags or []) if t.strip()]))
    return f"{sheet_type}:{user_id}:{tag_sig}" if tag_sig else f"{sheet_type}:{user_id}"


def _persist_sheet(
    db: Session,
    user_id: str,
    sheet_type: str,
    source_problems: list[dict],
    tags: Optional[list[str]] = None,
) -> PracticeResponse:
    signature = _sheet_signature(sheet_type, user_id, tags)
    now = datetime.utcnow()

    solved_rows = db.query(SolvedProblem).filter(SolvedProblem.user_id == user_id).all()
    solved_set = {
        _problem_key(row.contest_id, row.problem_index)
        for row in solved_rows
        if row.contest_id is not None and row.problem_index is not None
    }

    existing_items = (
        db.query(PracticeSheetItem)
        .filter(
            PracticeSheetItem.user_id == user_id,
            PracticeSheetItem.sheet_type == sheet_type,
            PracticeSheetItem.query_signature == signature,
        )
        .all()
    )
    existing_map = {item.problem_id: item for item in existing_items}

    active_ids = set()
    active_items = []

    for raw_problem in source_problems:
        normalized = _normalize_problem(raw_problem)
        problem_id = normalized["problem_id"]
        if not problem_id:
            continue

        active_ids.add(problem_id)
        solved = problem_id in solved_set

        item = existing_map.get(problem_id)
        if item:
            item.problem_name = normalized["name"] or item.problem_name
            item.rating = normalized["rating"]
            item.tags_json = json.dumps(normalized["tags"])
            if item.status != "solved":
                item.status = "solved" if solved else "seen"
            item.is_active = True
            item.last_seen_at = now
        else:
            item = PracticeSheetItem(
                user_id=user_id,
                sheet_type=sheet_type,
                query_signature=signature,
                problem_id=problem_id,
                contest_id=normalized["contest_id"],
                problem_index=normalized["index"],
                problem_name=normalized["name"] or "Unknown",
                rating=normalized["rating"],
                tags_json=json.dumps(normalized["tags"]),
                status="solved" if solved else "new",
                is_active=True,
                first_seen_at=now,
                last_seen_at=now,
            )
            db.add(item)
            existing_map[problem_id] = item

        active_items.append(item)

    archived_items = []
    for item in existing_items:
        if item.problem_id not in active_ids:
            item.is_active = False
            item.last_seen_at = now
            archived_items.append(item)

    db.commit()

    ordered_items = active_items + sorted(
        archived_items,
        key=lambda x: x.last_seen_at or now,
        reverse=True,
    )

    return PracticeResponse(
        problems=[_normalize_problem(item) for item in ordered_items],
        sheet_type=sheet_type,
        sheet_key=signature,
        target_rating=None,
        tags=tags or [],
        refreshed_at=now,
    )


def _generate_and_maybe_persist(
    db: Session,
    user_id: Optional[str],
    sheet_type: str,
    rating: int,
    count: int,
    tags: Optional[list[str]] = None,
) -> PracticeResponse:
    problems = CodeforcesService.generate_practice(rating=rating, count=count, tags=tags)
    normalized = [_normalize_problem(p) for p in problems]

    if not user_id:
        return PracticeResponse(
            problems=normalized,
            sheet_type=sheet_type,
            sheet_key=None,
            target_rating=rating,
            tags=tags or [],
            refreshed_at=datetime.utcnow(),
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return PracticeResponse(
            problems=normalized,
            sheet_type=sheet_type,
            sheet_key=None,
            target_rating=rating,
            tags=tags or [],
            refreshed_at=datetime.utcnow(),
        )

    return _persist_sheet(
        db=db,
        user_id=user_id,
        sheet_type=sheet_type,
        source_problems=normalized,
        tags=tags,
    )


@router.get("/div2", response_model=PracticeResponse)
def get_div2_problems(
    user_id: Optional[str] = Query(default=None),
    count: int = Query(default=60, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return _generate_and_maybe_persist(
        db=db,
        user_id=user_id,
        sheet_type="div2",
        rating=1600,
        count=count,
    )


@router.get("/div3", response_model=PracticeResponse)
def get_div3_problems(
    user_id: Optional[str] = Query(default=None),
    count: int = Query(default=60, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return _generate_and_maybe_persist(
        db=db,
        user_id=user_id,
        sheet_type="div3",
        rating=1100,
        count=count,
    )


@router.get("/generate", response_model=PracticeResponse)
def generate_practice(
    rating: int = Query(default=1200, ge=800, le=3500),
    count: int = Query(default=60, ge=1, le=100),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags"),
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()] if tags else []
    return _generate_and_maybe_persist(
        db=db,
        user_id=user_id,
        sheet_type="custom",
        rating=rating,
        count=count,
        tags=tag_list,
    )


@router.get("/user/{user_id}", response_model=PracticeResponse)
def get_practice(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return PracticeResponse(problems=[])

    target_rating = user.cf_rating or 1200
    problems = CodeforcesService.generate_practice(rating=target_rating, count=60)
    normalized = [_normalize_problem(p) for p in problems]

    return _persist_sheet(
        db=db,
        user_id=user_id,
        sheet_type="personal",
        source_problems=normalized,
        tags=[],
    )