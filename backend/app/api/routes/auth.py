import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import UserCreate, UserLogin, TokenResponse, UserMe, UserOut
from app.services.codeforces import get_user_info, get_user_solved_problems
from app.models import SolvedProblem, User

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

TOKEN_EXPIRE_HOURS = 24
_token_store: dict[str, tuple[str, datetime]] = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def create_token(user_id: str, username: str) -> str:
    data = f"{user_id}:{username}:{secrets.token_hex(16)}"
    token = hashlib.sha256(data.encode("utf-8")).hexdigest()
    expires = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    _token_store[token] = (user_id, expires)
    return token


def verify_token(token: str) -> Optional[str]:
    token_data = _token_store.get(token)
    if not token_data:
        return None

    user_id, expires = token_data
    if expires > datetime.utcnow():
        return user_id

    _token_store.pop(token, None)
    return None


@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pw = hash_password(user_in.password)

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pw,
        cf_handle=user_in.cf_handle,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_in.username).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.id, user.username)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMe)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/cf-handle")
def update_cf_handle(user_id: str, cf_handle: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.cf_handle = cf_handle
    db.commit()

    return {"message": "CF handle updated successfully", "cf_handle": cf_handle}


@router.post("/sync-cf")
def sync_cf(handle: str, user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        info = get_user_info(handle)
        solved_list = get_user_solved_problems(handle)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Codeforces handle")

    user.cf_handle = handle
    user.cf_rating = info.get("rating", 0)
    user.cf_rank = info.get("rank", "unrated")
    user.solved_count = len(solved_list)

    db.query(SolvedProblem).filter(
        SolvedProblem.user_id == user_id
    ).delete(synchronize_session=False)

    for contest_id, index, name, rating in solved_list:
        db.add(
            SolvedProblem(
                user_id=user_id,
                contest_id=contest_id,
                problem_index=index,
                problem_name=name,
                rating=rating,
            )
        )

    db.commit()

    return {
        "handle": handle,
        "rating": user.cf_rating,
        "rank": user.cf_rank,
        "solved_count": user.solved_count,
    }