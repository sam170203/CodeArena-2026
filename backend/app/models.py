"""Phase 1 ORM models for CodeArena."""

from __future__ import annotations

from datetime import datetime
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    xp = Column(Integer, default=0)

    duels_initiated = relationship('Duel', back_populates='initiator', foreign_keys='Duel.initiator_id')
    duels_opposed = relationship('Duel', back_populates='opponent', foreign_keys='Duel.opponent_id')
    submissions = relationship('Submission', back_populates='user')
    rooms = relationship('Room', back_populates='host')
    chat_messages = relationship('ChatMessage', back_populates='user')

class Duel(Base):
    __tablename__ = 'duels'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    initiator_id = Column(String(36), ForeignKey('users.id'))
    opponent_id = Column(String(36), ForeignKey('users.id'), nullable=True)
    problem_id = Column(String(36), nullable=False)
    status = Column(String(20), default='pending')
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    winner_id = Column(String(36), ForeignKey('users.id'), nullable=True)

    initiator = relationship('User', foreign_keys=[initiator_id], back_populates='duels_initiated')
    opponent = relationship('User', foreign_keys=[opponent_id], back_populates='duels_opposed')
    winner = relationship('User', foreign_keys=[winner_id])
    submissions = relationship('Submission', back_populates='duel')

class Submission(Base):
    __tablename__ = 'submissions'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    duel_id = Column(String(36), ForeignKey('duels.id'), nullable=True)
    room_id = Column(String(36), nullable=True)
    problem_id = Column(String(36), nullable=False)
    language = Column(String(16))
    code = Column(Text)
    status = Column(String(20), default='queued')
    stdout = Column(Text)
    stderr = Column(Text)
    runtime_ms = Column(Integer)
    score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship('User', back_populates='submissions')
    duel = relationship('Duel', back_populates='submissions')
    room = relationship('Room', back_populates='submissions')

class Room(Base):
    __tablename__ = 'rooms'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    host_id = Column(String(36), ForeignKey('users.id'))
    problem_id = Column(String(36), nullable=True)
    title = Column(String(100))
    max_participants = Column(Integer, default=4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    host = relationship('User', back_populates='rooms')
    submissions = relationship('Submission', back_populates='room')
    chat_messages = relationship('ChatMessage', back_populates='room')

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey('rooms.id'), nullable=True)
    duel_id = Column(String(36), ForeignKey('duels.id'), nullable=True)
    user_id = Column(String(36), ForeignKey('users.id'))
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship('Room', back_populates='chat_messages')
    duel = relationship('Duel', backref='chat_messages')
    user = relationship('User', backref='chat_messages')


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String, primary_key=True, default=generate_uuid)

    contest_id = Column(Integer, index=True)
    index = Column(String)
    name = Column(String)

    rating = Column(Integer, nullable=True)

    tags = Column(JSON)

    time_limit = Column(Integer)
    memory_limit = Column(Integer)
