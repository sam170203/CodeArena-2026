from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ---------------- Codeforces ----------------
class CFProblem(BaseModel):
    contest_id: Optional[int]
    index: Optional[str]
    name: Optional[str]
    rating: Optional[int]
    tags: Optional[List[str]] = []


class CFProblemsResponse(BaseModel):
    problems: List[CFProblem]


class PracticeResponse(BaseModel):
    problems: List[CFProblem]


# ---------------- User ----------------
class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMe(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    cf_handle: Optional[str] = None
    xp: int = 0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------- Submission ----------------
class SubmissionCreate(BaseModel):
    user_id: str
    problem_id: str
    language: str
    code: str
    duel_id: Optional[str] = None
    room_id: Optional[str] = None


class SubmissionOut(BaseModel):
    id: str
    user_id: str
    duel_id: Optional[str] = None
    room_id: Optional[str] = None
    problem_id: str
    language: str
    status: str
    runtime_ms: Optional[int] = None
    score: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------- Duel ----------------
class DuelCreate(BaseModel):
    initiator_id: str
    opponent_id: Optional[str] = None
    problem_id: str


class DuelOut(BaseModel):
    id: str
    initiator_id: str
    opponent_id: Optional[str] = None
    problem_id: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------- Room ----------------
class RoomCreate(BaseModel):
    host_id: str
    title: str
    problem_id: Optional[str] = None
    max_participants: int = 4


class RoomOut(BaseModel):
    id: str
    host_id: str
    title: str
    problem_id: Optional[str] = None
    max_participants: int

    class Config:
        from_attributes = True


# ---------------- Chat ----------------
class ChatMessageCreate(BaseModel):
    room_id: Optional[str] = None
    duel_id: Optional[str] = None
    user_id: str
    message: str


class ChatMessageOut(BaseModel):
    id: str
    room_id: Optional[str] = None
    duel_id: Optional[str] = None
    user_id: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True