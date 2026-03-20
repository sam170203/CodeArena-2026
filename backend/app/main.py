import os
import json
import time
import asyncio
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from .db import get_db
from . import crud, schemas
from .schemas import CFProblemsResponse
from .services.codeforces import CodeforcesService
from .api.routes.auth import router as auth_router
from .api.routes.practice import router as practice_router
from .api.routes.duel import router as duel_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(practice_router)
app.include_router(duel_router)

# In-memory structures for MVP (replace with DB-backed ORM later)
duel_subs: dict[str, set] = {}
duel_states: dict[str, dict] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

from .schemas import CFProblemsResponse

@app.get("/cf/problems", response_model=CFProblemsResponse)
def cf_problems():
    try:
        problems = CodeforcesService.fetch_problemset()

        mapped = [
            {
                "contest_id": p.get("contestId"),
                "index": p.get("index"),
                "name": p.get("name"),
                "rating": p.get("rating"),
            }
            for p in problems[:50]
        ]

        return {"problems": mapped}

    except Exception as e:
        print(e)
        return {"problems": []}

@app.post("/submissions/submit", response_model=schemas.SubmissionOut)
async def submit(sub_in: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    # Validate user exists
    user = crud.get_user(db, sub_in.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    # Create submission via CRUD layer
    sub = crud.create_submission(db, sub_in, user_id=sub_in.user_id)
    # Publish to Redis submission_queue (best-effort)
    try:
        import redis, json
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.Redis.from_url(redis_url)
        payload = {
            "submission_id": sub.id,
            "user_id": sub_in.user_id,
            "problem_id": sub_in.problem_id,
            "language": sub_in.language
        }
        r.publish("submission_queue", json.dumps(payload))
    except Exception as e:
        print(f"Redis publish failed: {e} (phase1C)")
    return sub

@app.websocket("/ws/duel/{duel_id}")
async def duel_ws(websocket: WebSocket, duel_id: str):
    await websocket.accept()
    # Register websocket for this duel
    s = duel_subs.setdefault(duel_id, set())
    s.add(websocket)
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
        s.discard(websocket)

async def broadcast_duel(duel_id: str, message: dict):
    clients = list(duel_subs.get(duel_id, set()))
    for ws in clients:
        try:
            await ws.send_json(message)
        except Exception:
            pass
