from datetime import datetime
from typing import Optional

from pydantic import BaseModel

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
    orm_mode = True

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
    orm_mode = True

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
    orm_mode = True

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
    orm_mode = True

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
    orm_mode = True
