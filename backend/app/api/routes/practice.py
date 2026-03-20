from typing import Optional, List
from fastapi import APIRouter, Query

from app.schemas import PracticeResponse
from app.services.codeforces import CodeforcesService

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/div2", response_model=PracticeResponse)
def get_div2_problems():
    problems = CodeforcesService.generate_practice(rating=1400, count=60)
    return {"problems": problems}


@router.get("/div3", response_model=PracticeResponse)
def get_div3_problems():
    problems = CodeforcesService.generate_practice(rating=1100, count=60)
    return {"problems": problems}


@router.get("/generate", response_model=PracticeResponse)
def generate_practice(
    rating: int = Query(default=1200, ge=800, le=3500),
    count: int = Query(default=5, ge=1, le=50),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags")
):
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    problems = CodeforcesService.generate_practice(rating, count, tag_list)
    return {"problems": problems}
