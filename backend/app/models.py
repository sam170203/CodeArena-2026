# backend/app/models.py
"""SQLAlchemy ORM models for CodeArena (Phase 1 / Phase 2 safe version)."""

from datetime import datetime
import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .db import Base  # ensure backend/app/db.py defines Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    xp = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="host")
    # duels relationships are available via Duel's foreign keys
    chat_messages = relationship("ChatMessage", back_populates="user")


class Duel(Base):
    __tablename__ = "duels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    initiator_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    opponent_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    problem_id = Column(String(128), nullable=False, index=True)
    status = Column(String(32), default="pending")  # pending, started, finished
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    winner_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    submissions = relationship("Submission", back_populates="duel")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    duel_id = Column(String(36), ForeignKey("duels.id"), nullable=True)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=True)
    problem_id = Column(String(128), nullable=False)
    language = Column(String(16), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(32), default="queued")  # queued, running, AC, WA, TLE, RE
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    runtime_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    duel = relationship("Duel", back_populates="submissions")
    room = relationship("Room", back_populates="submissions")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(128), nullable=True)
    problem_id = Column(String(128), nullable=True)
    max_participants = Column(Integer, default=4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    host = relationship("User", back_populates="rooms")
    submissions = relationship("Submission", back_populates="room")
    chat_messages = relationship("ChatMessage", back_populates="room")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=True)
    duel_id = Column(String(36), ForeignKey("duels.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="chat_messages")
    duel = relationship("Duel", backref="chat_messages")
    user = relationship("User", back_populates="chat_messages")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contest_id = Column(Integer, nullable=True, index=True)
    index = Column(String(10), nullable=False)
    name = Column(String(255), nullable=False)
    rating = Column(Integer, nullable=True)
    tags = Column(Text, nullable=True)  # store comma-separated tags for now
    time_limit = Column(Integer, nullable=True)
    memory_limit = Column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<Problem {self.contest_id}-{self.index} {self.name}>"