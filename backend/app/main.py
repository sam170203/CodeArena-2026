import json
import os
import time

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import get_db, engine, Base
from . import crud, schemas, models
from .schemas import CFProblemsResponse
from .services.codeforces import CodeforcesService
from .api.routes.auth import router as auth_router
from .api.routes.practice import router as practice_router
from .api.routes.duel import router as duel_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    }


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
    user = db.query(models.User).filter(models.User.id == sub_in.user_id).first()
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

    await websocket.send_json({"type": "connected", "duel_id": duel_id})

    try:
        while True:
            msg = await websocket.receive_text()
            try:
                payload = json.loads(msg)
            except Exception:
                payload = {"type": "unknown", "payload": msg}

            etype = payload.get("type", "unknown")

            if etype == "JOIN_ROOM":
                await broadcast_duel(duel_id, {"type": "join_room", "payload": payload})
            elif etype == "START_DUEL":
                duel_states[duel_id] = {"status": "started", "started_at": time.time()}
                await broadcast_duel(duel_id, {"type": "start_duel", "payload": duel_states[duel_id]})
            elif etype == "SUBMIT_SOLUTION":
                await broadcast_duel(duel_id, {"type": "submission", "payload": payload})
            elif etype == "SCORE_UPDATE":
                await broadcast_duel(duel_id, {"type": "score_update", "payload": payload})
            elif etype == "CHAT_MESSAGE":
                await broadcast_duel(duel_id, {"type": "chat_message", "payload": payload})
            elif etype == "END_DUEL":
                duel_states[duel_id] = {"status": "finished", "finished_at": time.time()}
                await broadcast_duel(duel_id, {"type": "end_duel", "payload": duel_states[duel_id]})
            else:
                await websocket.send_json({"type": "echo", "payload": payload})
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
        if not clients:
            duel_subs.pop(duel_id, None)


async def broadcast_duel(duel_id: str, message: dict):
    clients = list(duel_subs.get(duel_id, set()))
    for ws in clients:
        try:
            await ws.send_json(message)
        except Exception:
            pass