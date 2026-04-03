# CodeArena
Link --> https://code-arena-wine.vercel.app/

A Codeforces-native competitive coding platform built from scratch. CodeArena lets you practice problems from Codeforces in organized sheets, challenge other coders in real-time duels, and track your growth — all without building a judge from scratch. The key architectural insight: instead of running and judging code internally, CodeArena uses the Codeforces API as its backend for problems and verdict verification.

---

## How it works

CodeArena is a **thin coordination layer on top of Codeforces**. Problems come from the Codeforces problemset API. Users solve problems directly on the Codeforces website. Verdicts are verified by reading the user's Codeforces submission history via the CF API. CodeArena adds the social and competitive layer: persistent practice sheets, real-time duel rooms, and user profiles that aggregate CF data.

---

## Features (current state)

### Authentication
- Register and login with username/email and password.
- JWT-based authentication with a custom HMAC-signed token implementation (no third-party auth library).
- Link your Codeforces handle to your profile.
- Sync your CF rating, rank, and solved problem history with one click.

### Practice Sheets
- **Div 2 sheet** — problems rated around 1600 (±200), pulled fresh from CF.
- **Div 3 sheet** — problems rated around 1100 (±200).
- **Personalized sheet** — problems matched to your current CF rating.
- **Custom sheet** — pick any target rating and filter by tags (e.g. `dp, greedy`).
- Solve status is persisted per user — solved problems show green based on your CF submission history.
- Sheets auto-refresh every 3 minutes and cache CF data in Redis for 1 hour.

### Duels
- Create a room with a target participant count (2–5 players).
- The problem is automatically selected from CF based on the highest rating among all participants.
- Join a room by duel ID or by looking up the host's user ID.
- The host starts the duel when ready.
- Everyone solves the problem on Codeforces. The first person to hit "Submit Solution" in CodeArena after getting an AC verdict wins.
- Win/loss counts are updated on each user's profile.
- Real-time room state updates via WebSocket.

### Profile
- View your username, email, CF handle, CF rating, rank, and solved count.
- Update and sync your CF handle at any time.

---

## Tech stack

**Frontend** is built with Next.js 16 (Pages Router), React 19, Zustand 5 for global auth state, and Axios for API calls. Styling is inline CSS with a dark glassmorphism aesthetic.

**Backend** is built with FastAPI and SQLAlchemy (sync ORM). Database migrations are handled by Alembic. Authentication uses a custom base64 + HMAC-SHA256 token system. The Codeforces integration is in `backend/app/services/codeforces.py` and handles rate limiting, Redis caching, and all CF API calls.

**Database** is PostgreSQL. Redis is used for CF API response caching (problemset cached 1 hour, user data cached 10 minutes) and as a submission queue channel.

**Infrastructure** uses Docker and Docker Compose. A GitHub Actions CI/CD pipeline builds and pushes Docker images to GitHub Container Registry on every push to `main`.

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Zustand 5, Axios |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL |
| Cache / Queue | Redis 7 |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions → GHCR |

---

## Project structure

```
CodeArena/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, WebSocket, submission endpoint
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── crud.py            # Database helper functions
│   │   ├── db.py              # Database connection and session
│   │   ├── api/routes/
│   │   │   ├── auth.py        # Register, login, CF handle sync
│   │   │   ├── practice.py    # Practice sheet generation and persistence
│   │   │   └── duel.py        # Duel lifecycle: create, join, start, submit
│   │   └── services/
│   │       └── codeforces.py  # CF API client with rate limiting and Redis cache
│   ├── alembic/               # Database migration files
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   │   ├── index.js           # Landing page
│   │   ├── login.js           # Login form
│   │   ├── register.js        # Registration form
│   │   ├── profile.js         # User profile and CF sync
│   │   ├── practice/index.js  # Practice sheet UI (all 4 modes)
│   │   └── duel/index.js      # Duel lobby + room UI
│   ├── components/
│   │   ├── Navbar.jsx         # Global navigation
│   │   └── Layout.jsx         # Page layout wrapper
│   ├── store/authStore.js     # Zustand auth store (token + user)
│   ├── lib/api.js             # Axios instance and all API call definitions
│   └── styles/globals.css     # Global styles
├── sql/schema.sql             # Schema placeholder (Alembic handles migrations)
├── docker-compose.yaml        # Runs frontend, backend, and Redis together
└── .github/workflows/ci-cd.yaml
```

---

## Database schema

The core entities and their relationships are:

- **User** has many Submissions, DuelParticipations, PracticeSheetItems, and SolvedProblems.
- **Duel** has many DuelParticipants and Submissions. It tracks `status` (waiting → active → finished), `rating_target`, and `winner_id`.
- **DuelParticipant** is the join table between User and Duel, storing each player's rating at the time they joined.
- **Submission** records every code submission, linked optionally to a Duel or Room.
- **PracticeSheetItem** is the persistent record of a problem on a user's sheet, including its solve `status` (new / seen / solved / archived).
- **SolvedProblem** is a local cache of the user's CF-verified solves, populated on CF sync.
- **Problem**, **Room**, and **ChatMessage** models exist in the schema but are not yet surfaced via API routes.

---

## Running locally

### Prerequisites

Docker and Docker Compose must be installed. No other local setup is required.

### With Docker Compose

```bash
git clone https://github.com/pranshu3125/CodeArena-.git
cd CodeArena-
docker-compose up --build
```

This starts three services: the Next.js frontend on port 3000, the FastAPI backend on port 8000, and Redis on port 6379.

### Without Docker (development mode)

**Backend:**
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
