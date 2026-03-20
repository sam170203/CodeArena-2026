"""CRUD helpers for Phase 1 (Users, Duels, Submissions, Rooms, ChatMessages). Uses SQLAlchemy ORM and returns ORM objects."""

from typing import Optional
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from . import models, schemas


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Users

def get_user(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        created_at=datetime.utcnow(),
        xp=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def update_user_cf_handle(db: Session, user_id: str, cf_handle: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.cf_handle = cf_handle
        db.commit()
        db.refresh(user)
    return user


# Submissions

def create_submission(db: Session, submission_in: schemas.SubmissionCreate, user_id: str) -> models.Submission:
    sub = models.Submission(
        user_id=user_id,
        duel_id=submission_in.duel_id,
        room_id=submission_in.room_id,
        problem_id=submission_in.problem_id,
        language=submission_in.language,
        code=submission_in.code,
        status="queued",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

# Duels

def create_duel(db: Session, initiator_id: str, problem_id: str, opponent_id: Optional[str] = None) -> models.Duel:
    duel = models.Duel(
        initiator_id=initiator_id,
        opponent_id=opponent_id,
        problem_id=problem_id,
        status="pending",
        started_at=None,
        finished_at=None
    )
    db.add(duel)
    db.commit()
    db.refresh(duel)
    return duel

# Rooms

def create_room(db: Session, host_id: str, title: str, problem_id: Optional[str], max_participants: int) -> models.Room:
    room = models.Room(
        host_id=host_id,
        title=title,
        problem_id=problem_id,
        max_participants=max_participants
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

# Chat Messages

def create_chat_message(db: Session, room_id: Optional[str], duel_id: Optional[str], user_id: str, message: str) -> models.ChatMessage:
    msg = models.ChatMessage(
        room_id=room_id,
        duel_id=duel_id,
        user_id=user_id,
        message=message,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
