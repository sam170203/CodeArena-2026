import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db import get_db
from app import crud, models
from app.schemas import UserCreate, UserLogin, TokenResponse, UserMe

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

TOKEN_EXPIRE_HOURS = 24


def create_token(user_id: str, username: str) -> str:
    data = f"{user_id}:{username}:{secrets.token_hex(16)}"
    token = hashlib.sha256(data.encode()).hexdigest()
    expires = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    _token_store[token] = (user_id, expires)
    return token


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


@router.post("/register", response_model=UserMe)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = crud.create_user(db, user_in)
    return user


@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, user_in.username)
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id, user.username)
    return TokenResponse(access_token=token)


_token_store: dict[str, tuple[str, datetime]] = {}


def verify_token(token: str, db: Session) -> Optional[str]:
    if token in _token_store:
        user_id, expires = _token_store[token]
        if expires > datetime.utcnow():
            return user_id
    return None


@router.get("/me", response_model=UserMe)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user_id = verify_token(token, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
