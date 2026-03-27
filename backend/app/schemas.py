from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CFProblem(BaseModel):
    contest_id: Optional[int] = None
    index: Optional[str] = None
    name: Optional[str] = None
    rating: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None

    problem_id: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PracticeResponse(BaseModel):
    problems: List[CFProblem]
    sheet_type: Optional[str] = None
    sheet_key: Optional[str] = None
    target_rating: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    refreshed_at: Optional[datetime] = None


class CFProblemsResponse(BaseModel):
    problems: List[CFProblem]


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    cf_handle: str | None = None


class UserLogin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
    max_participants: int = Field(default=5, ge=2, le=5)


class DuelCreateResponse(BaseModel):
    duel_id: str
    problem_id: str
    problem_name: Optional[str] = None
    rating: Optional[int] = None
    status: str = "waiting"
    participants_count: int = 1
    max_participants: int = 5
    rating_target: Optional[int] = None


class DuelJoin(BaseModel):
    duel_id: str
    opponent_id: str


class DuelStartRequest(BaseModel):
    duel_id: str
    user_id: str


class DuelStartResponse(BaseModel):
    duel_id: str
    status: str
    problem_id: str
    problem_name: Optional[str] = None
    message: str
    participants_count: int = 0


class DuelSubmitRequest(BaseModel):
    duel_id: str
    user_id: str


class DuelSubmitResult(BaseModel):
    duel_id: str
    user_id: str
    success: bool
    verdict: str
    winner_id: Optional[str] = None


class DuelParticipantOut(BaseModel):
    user_id: str
    username: str
    cf_rating: int = 0
    joined_at: Optional[datetime] = None


class DuelOut(BaseModel):
    id: str
    host_id: str
    opponent_id: Optional[str] = None
    problem_id: Optional[str] = None
    problem_name: Optional[str] = None
    problem_rating: Optional[int] = None
    status: str
    winner_id: Optional[str] = None
    rating_target: Optional[int] = None
    max_participants: int = 5
    participants_count: int = 0
    participants: List[DuelParticipantOut] = Field(default_factory=list)
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