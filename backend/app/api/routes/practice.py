from fastapi import APIRouter
from app.schemas import PracticeResponse
from app.services.codeforces import CodeforcesService

router = APIRouter()

@router.get("/practice/div2", response_model=PracticeResponse)
def get_div2_practice():
    problems = CodeforcesService.generate_practice(rating=1400, count=5)
    return {"problems": problems}