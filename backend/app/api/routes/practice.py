from fastapi import APIRouter
from app.services.codeforces import CodeforcesService

router = APIRouter()

@router.get("/generate")
def generate_practice(rating: int = 1200, count: int = 5):
    problems = CodeforcesService.generate_practice(rating, count)
    return {"problems": problems}