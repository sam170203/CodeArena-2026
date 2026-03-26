from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class CFProblem(BaseModel):
    contest_id: Optional[int] = None
    index: Optional[str] = None
    name: Optional[str] = None
    rating: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class PracticeResponse(BaseModel):
    problems: List[CFProblem]


class CFProblemsResponse(BaseModel):
    problems: List[CFProblem]


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    cf_handle: str | None = None


class UserOut(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    cf_handle: Optional[str] = None
    xp: int = 0
    cf_rating: int = 0
    cf_rank: Optional[str] = None
    solved_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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
    cf_rating: int = 0
    cf_rank: Optional[str] = None
    solved_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


class DuelCreate(BaseModel):
    host_id: str
    rating: Optional[int] = 1200


class DuelCreateResponse(BaseModel):
    duel_id: str
    problem_id: str
    problem_name: Optional[str] = None
    rating: Optional[int] = None
    status: str = "waiting"


class DuelJoin(BaseModel):
    duel_id: str
    opponent_id: str


class DuelStartResponse(BaseModel):
    duel_id: str
    status: str
    problem_id: str
    problem_name: Optional[str] = None
    message: str


class DuelSubmitResult(BaseModel):
    duel_id: str
    user_id: str
    success: bool
    verdict: str
    winner_id: Optional[str] = None


class DuelOut(BaseModel):
    id: str
    initiator_id: str
    opponent_id: Optional[str] = None
    problem_id: str
    status: str
    winner_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)