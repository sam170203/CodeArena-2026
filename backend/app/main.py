import json
import os
import time

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas
from .db import Base, engine, get_db
from .models import Duel, DuelParticipant, User
from .schemas import CFProblemsResponse
from .services.codeforces import CodeforcesService
from .api.routes.auth import router as auth_router
from .api.routes.practice import router as practice_router
from .api.routes.duel import router as duel_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(practice_router)
app.include_router(duel_router)

duel_subs: dict[str, set] = {}
duel_states: dict[str, dict] = {}


def _normalize_problem(problem):
    if hasattr(problem, "model_dump"):
        problem = problem.model_dump()

    return {
        "contest_id": problem.get("contestId", problem.get("contest_id")),
        "index": problem.get("index"),
        "name": problem.get("name"),
        "rating": problem.get("rating"),
        "tags": problem.get("tags") or [],
        "time_limit": problem.get("timeLimit", problem.get("time_limit")),
        "memory_limit": problem.get("memoryLimit", problem.get("memory_limit")),
        "problem_id": problem.get("problem_id")
        or (
            f"{problem.get('contestId', problem.get('contest_id'))}-{problem.get('index')}"
            if problem.get("index") is not None
            else None
        ),
    }


def _serialize_duel_state(db: Session, duel_id: str):
    duel = db.query(Duel).filter(Duel.id == duel_id).first()
    if not duel:
        return {"exists": False}

    participant_rows = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )

    participants = []
    for row in participant_rows:
        user = db.query(User).filter(User.id == row.user_id).first()
        participants.append({
            "user_id": row.user_id,
            "username": user.username if user else row.user_id,
            "cf_rating": row.current_rating or (user.cf_rating if user else 0),
            "joined_at": row.joined_at.isoformat() if row.joined_at else None,
        })

    return {
        "exists": True,
        "id": duel.id,
        "host_id": duel.host_id,
        "status": duel.status,
        "problem_id": duel.problem_id,
        "problem_name": duel.problem_name,
        "problem_rating": duel.problem_rating,
        "rating_target": duel.rating_target,
        "max_participants": duel.max_participants,
        "participants_count": len(participants),
        "participants": participants,
        "winner_id": duel.winner_id,
        "started_at": duel.started_at.isoformat() if duel.started_at else None,
        "finished_at": duel.finished_at.isoformat() if duel.finished_at else None,
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "CodeArena backend"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/cf/problems", response_model=CFProblemsResponse)
def cf_problems():
    try:
        problems = CodeforcesService.fetch_problemset()
        mapped = [_normalize_problem(p) for p in problems[:50]]
        return {"problems": mapped}
    except Exception as e:
        print(e)
        return {"problems": []}


@app.post("/submissions/submit", response_model=schemas.SubmissionOut)
async def submit(sub_in: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, sub_in.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    sub = crud.create_submission(db, sub_in, user_id=sub_in.user_id)

    try:
        import redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.Redis.from_url(redis_url)
        payload = {
            "submission_id": sub.id,
            "user_id": sub_in.user_id,
            "problem_id": sub_in.problem_id,
            "language": sub_in.language,
        }
        r.publish("submission_queue", json.dumps(payload))
    except Exception as e:
        print(f"Redis publish failed: {e} (phase1C)")

    return sub


@app.websocket("/ws/duel/{duel_id}")
async def duel_ws(websocket: WebSocket, duel_id: str):
    await websocket.accept()

    clients = duel_subs.setdefault(duel_id, set())
    clients.add(websocket)

    db = next(get_db())
    try:
        await websocket.send_json({"type": "connected", "duel_id": duel_id, "state": _serialize_duel_state(db, duel_id)})

        while True:
            msg = await websocket.receive_text()
            try:
                payload = json.loads(msg)
            except Exception:
                payload = {"type": "unknown", "payload": msg}

            etype = payload.get("type", "unknown")

            if etype == "JOIN_ROOM":
                await broadcast_duel(duel_id, {"type": "join_room", "payload": payload})
                await broadcast_duel(duel_id, {"type": "state", "payload": _serialize_duel_state(db, duel_id)})
            elif etype == "START_DUEL":
                await broadcast_duel(duel_id, {"type": "start_duel", "payload": payload})
                await broadcast_duel(duel_id, {"type": "state", "payload": _serialize_duel_state(db, duel_id)})
            elif etype == "SUBMIT_SOLUTION":
                await broadcast_duel(duel_id, {"type": "submission", "payload": payload})
            elif etype == "SCORE_UPDATE":
                await broadcast_duel(duel_id, {"type": "score_update", "payload": payload})
            elif etype == "CHAT_MESSAGE":
                await broadcast_duel(duel_id, {"type": "chat_message", "payload": payload})
            elif etype == "END_DUEL":
                await broadcast_duel(duel_id, {"type": "end_duel", "payload": payload})
                await broadcast_duel(duel_id, {"type": "state", "payload": _serialize_duel_state(db, duel_id)})
            else:
                await websocket.send_json({"type": "echo", "payload": payload})
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
        if not clients:
            duel_subs.pop(duel_id, None)
        db.close()


async def broadcast_duel(duel_id: str, message: dict):
    clients = list(duel_subs.get(duel_id, set()))
    for ws in clients:
        try:
            await ws.send_json(message)
        except Exception:
            pass