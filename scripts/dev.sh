#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$ROOT/backend/.venv" ]]; then
  python3 -m venv "$ROOT/backend/.venv"
  "$ROOT/backend/.venv/bin/pip" install -r "$ROOT/backend/requirements.txt"
fi
[[ -d "$ROOT/frontend/node_modules" ]] || (cd "$ROOT/frontend" && npm install)
[[ -f "$ROOT/frontend/.env.local" ]] || cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"

for port in 8000 3000; do
  lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
done
sleep 1

echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:3000"

(cd "$ROOT/backend" && source .venv/bin/activate && exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
(cd "$ROOT/frontend" && exec npm run dev -- -H 127.0.0.1 -p 3000) &
wait
