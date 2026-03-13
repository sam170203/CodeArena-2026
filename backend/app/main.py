import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import os
import json
import requests
import time
import uuid

app = FastAPI()

# In-memory structures for MVP (replace with DB-backed ORM later)
duel_subs: dict[str, set] = {}
duel_states: dict[str, dict] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/cf/problems")
def cf_problems():
    try:
        resp = requests.get("https://codeforces.com/api/problemset.problems", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return {"problems": data.get("result", {}).get("problems", [])}
    except Exception:
        pass
    return {"problems": []}

@app.post("/submissions/submit")
async def submit(problem_id: str, language: str, code: str, duel_id: str | None = None, room_id: str | None = None):
    submission_id = str(uuid.uuid4())
    # In MVP, we just acknowledge; actual sandbox will be wired later
    return {"submission_id": submission_id, "status": "queued"}

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
