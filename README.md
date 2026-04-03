# CodeArena - Real-time Competitive Programming Platform

Minimal MVP for competitive coding duels with Codeforces integration.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: Next.js (placeholder)
- **Cache**: Redis (optional)

## Features

- User registration/login with JWT tokens
- Codeforces handle management
- Real-time duel system (create, join, start, submit)
- Practice problem generation from Codeforces

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get token
- `PUT /auth/cf-handle` - Set Codeforces handle
- `GET /auth/me` - Get current user profile

### Practice
- `GET /practice/div2` - Div2 problems
- `GET /practice/div3` - Div3 problems
- `GET /practice/generate?rating=1200&count=5` - Generate problems by rating

### Duel
- `POST /duel/create` - Create a duel
- `POST /duel/join` - Join a duel
- `POST /duel/start` - Start the duel
- `POST /duel/submit` - Submit solution
- `GET /duel/{id}` - Get duel state

## Running

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY="your-secret-key"
export DATABASE_URL="postgresql://user:password@localhost/codearena"
export REDIS_URL="redis://localhost:6379/0"

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install

# Set environment variable
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8000" >> .env.local

npm run dev
```

---

## Environment variables

**Backend:**

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `codearena-dev-secret` | HMAC signing key for JWT tokens |
| `DATABASE_URL` | SQLite fallback | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `CORS_ORIGINS` | localhost:3000 + Vercel URLs | Comma-separated allowed origins |

**Frontend:**

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://127.0.0.1:8000` | WebSocket base URL |

---

## API reference

### Auth (`/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new account |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current user (requires token) |
| PUT | `/auth/cf-handle` | Update Codeforces handle |
| POST | `/auth/sync-cf` | Pull rating + solved history from CF |

### Practice (`/practice`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/practice/div2` | Get Div 2 sheet (rating ~1600) |
| GET | `/practice/div3` | Get Div 3 sheet (rating ~1100) |
| GET | `/practice/generate` | Custom sheet by rating + tags |
| GET | `/practice/user/{user_id}` | Personalized sheet by user's CF rating |

### Duels (`/duel`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/duel/create` | Create a duel room |
| POST | `/duel/join` | Join a duel by duel ID |
| POST | `/duel/start` | Start the duel (host only) |
| GET | `/duel/{duel_id}` | Get duel state |
| GET | `/duel/host/{host_id}` | Find active duel by host |
| GET | `/duel/{duel_id}/problem` | Get the duel's problem (participants only) |
| POST | `/duel/submit` | Check CF for AC verdict, update winner |

### WebSocket

| Endpoint | Description |
|---|---|
| `WS /ws/duel/{duel_id}` | Real-time duel room state and events |

Events broadcast over WebSocket: `JOIN_ROOM`, `START_DUEL`, `END_DUEL`, `SUBMIT_SOLUTION`, `SCORE_UPDATE`, `CHAT_MESSAGE`.

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cf/problems` | Fetch first 50 problems from CF problemset |
| POST | `/submissions/submit` | Queue a code submission (verdict processing pending) |
| GET | `/health` | Health check |

---

## Known limitations and incomplete work

The following features are scaffolded (models/schemas exist) but not yet complete:

**Submission worker** — `/submissions/submit` stores code and publishes to Redis, but there is no background worker consuming the queue. Submissions stay in `"queued"` status indefinitely. The actual verdict verification for duels goes through `/duel/submit` (CF API check), not this endpoint.

**Duel room page** — `pages/duel/[duelId].js` exists as a route but is a bare placeholder showing only raw WebSocket messages. The full duel room experience lives in `pages/duel/index.js` via query string (`?duelId=xxx`).

**WebSocket scaling** — The in-memory `duel_subs` dict means WebSocket state is not shared across multiple backend instances. Running more than one backend process will break real-time updates.

**XP system** — The `xp` column exists on the User model and is never incremented.

**Rooms and Chat** — The `Room` and `ChatMessage` models and their CRUD functions exist but have no API routes or frontend UI.

**Lobby / matchmaking** — There is no way to browse open duels. Players must share duel IDs or host user IDs manually.

**Password hashing** — Currently uses SHA-256. Should be replaced with bcrypt for production security.

**SQL schema file** — `sql/schema.sql` is a placeholder. All schema management is done via Alembic migrations.

---

## CI/CD

GitHub Actions runs on every push to `main` and every pull request. It builds both the frontend and backend, then pushes Docker images to GitHub Container Registry (`ghcr.io`). Tests are currently a placeholder (`echo "Running tests..."`).

---

## Contributing

This project is built from scratch as a learning exercise. If you want to contribute or fork it, the best places to start are fixing the submission worker, building the duel room page, and adding the lobby/browse feature.
