# CodeArena 2026 — Architecture & Engineering Guide

> A complete walk-through of what was built, how it works, and **why** every choice was made.
> Read this end-to-end. Try the quiz questions at the end of each section before reading on.

**Live:**
- Frontend → https://code-arena-2026.vercel.app
- Backend  → https://codearena-backend-f05o.onrender.com
- API docs → https://codearena-backend-f05o.onrender.com/docs

---

## Table of contents

1. [Big picture](#1-big-picture)
2. [The stack — every tech and why](#2-the-stack--every-tech-and-why)
3. [Frontend deep dive](#3-frontend-deep-dive)
4. [Backend deep dive](#4-backend-deep-dive)
5. [Database & data model](#5-database--data-model)
6. [Authentication (JWT)](#6-authentication-jwt)
7. [Matchmaking algorithm](#7-matchmaking-algorithm)
8. [ELO math](#8-elo-math)
9. [Codeforces verdict polling](#9-codeforces-verdict-polling)
10. [Realtime: the WebSocket layer](#10-realtime-the-websocket-layer)
11. [Friend duels & async challenges](#11-friend-duels--async-challenges)
12. [Streaks, quests, cosmetics, decks](#12-streaks-quests-cosmetics-decks)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Design patterns used](#14-design-patterns-used)
15. [Glossary](#15-glossary)
16. [Final exam](#16-final-exam)

---

## 1. Big picture

### What you built

CodeArena is a **real-time competitive-programming duel platform** with the addictive gamification of Clash Royale wrapped around real Codeforces problems. Two (or more) players link their Codeforces handles, get matched on ELO, race up a 5-problem ladder, submit on Codeforces, and our backend polls the CF API to detect verdicts and drive the duel HUD live.

Crucially: **we never run our own judge.** Codeforces is the source of truth. This is a deliberate architectural choice — running an online judge means sandboxes, language toolchains, time/memory limits, test data, security boundaries. Months of work. By delegating to CF we trade some UX (you submit on CF, not in our app) for a massively simpler system.

### The 30,000-foot view

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (player A)                         │
│  Next.js app  ←──── WebSocket ────→  state updates in real time   │
│       │                                                           │
│       │  REST                                                     │
│       ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              VERCEL  (hosts frontend bundle)              │     │
│  └─────────────────────────────────────────────────────────┘     │
│                              │                                    │
│                  REST + WebSocket                                 │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │   RENDER  ─  FastAPI app  +  asyncio workers              │     │
│  │   ┌───────────────────────┐  ┌────────────────────────┐  │     │
│  │   │ HTTP / WS endpoints   │  │ Background loops:       │  │     │
│  │   │ — auth                │  │ • Matchmaker (1s tick)  │  │     │
│  │   │ — duel/state          │  │ • CF poller (3s tick)   │  │     │
│  │   │ — friend-duel         │  │                          │  │     │
│  │   │ — lobby               │  │ Hit codeforces.com/api/  │  │     │
│  │   │ — quests              │  │   user.status every tick │  │     │
│  │   │ etc.                  │  │                          │  │     │
│  │   └─────────┬─────────────┘  └────────┬────────────────┘  │     │
│  │             │                          │                   │     │
│  │             └────────┬─────────────────┘                   │     │
│  │                      ▼                                     │     │
│  │   ┌─────────────────────────────────────┐                  │     │
│  │   │  PostgreSQL  (Render)               │                  │     │
│  │   │  users, duels, duel_steps,           │                  │     │
│  │   │  matchmaking_queue, elo_history,     │                  │     │
│  │   │  streaks, quests, friend_rooms, …    │                  │     │
│  │   └─────────────────────────────────────┘                  │     │
│  └─────────────────────────────────────────────────────────┘     │
│                              │                                    │
│              outbound HTTP   ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │             codeforces.com  (public API)                  │     │
│  │  user.info  ·  user.status  ·  problemset.problems         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### What runs where

| Component | Where | Why |
|---|---|---|
| Static frontend assets | **Vercel** | Best-in-class Next.js hosting, free tier, global CDN |
| API + WebSockets | **Render** | Supports long-lived processes & WebSockets (Vercel serverless can't hold WS) |
| Database | **Render Postgres** | Sits in same private network as the backend → free fast internal queries |
| Code repository | **GitHub** | Both Vercel and Render auto-deploy on push |

### Why split frontend + backend like that

Three reasons:

1. **Different runtime profiles.** Frontend = ephemeral request/response, scales to zero. Backend = long-lived asyncio workers (matchmaker + CF poller must stay alive between requests to do their jobs).
2. **WebSockets need persistent connections.** Vercel's serverless functions die in seconds; you can't keep a duel HUD's WebSocket open on Vercel. Render's normal web service can.
3. **Independent deploy cadences.** Frontend UX tweaks shouldn't restart your backend workers. Backend changes shouldn't invalidate your CDN cache.

### ❓ Quiz — Big picture

1. Why don't we run our own code judge?
2. Why is the backend on Render and not Vercel?
3. What's the role of Codeforces in this architecture — peer or dependency?
4. What two things does the backend keep alive that a request/response server wouldn't?

---

## 2. The stack — every tech and why

### Frontend

| Tech | What it is | Why this one |
|---|---|---|
| **Next.js 16 (App Router)** | React framework with routing, SSR/SSG, server components, file-based pages | The de-facto choice for production React apps in 2026. App Router gives us server components for the static surfaces (landing, leaderboard) — smaller client bundle |
| **TypeScript (strict)** | Typed superset of JavaScript | Compile-time safety on WebSocket event handling alone saves a week of bugs. Discriminated unions on `DuelEvent` mean exhaustive handling is checked by `tsc` |
| **Tailwind v4** | Utility-first CSS | Tokens defined once (`--color-neon-pink` etc.) in `globals.css`, used everywhere via `bg-[var(--color-neon-pink)]`. Zero CSS-in-JS overhead, zero design-system library bloat |
| **Zustand** | Tiny client state store (1.2kB) | We have ~5 stores (auth, duel, queue, ...). Each store is a single `create()` call with state + actions. No reducers, no providers, no boilerplate |
| **TanStack Query** | Server-state cache | Auto-caching, refetching, invalidation for any `useQuery(['key'], fetchFn)`. Replaces ad-hoc `useEffect + setState + fetch` patterns |
| **framer-motion** | Declarative animations | The arena-entrance, victory ceremony, promotion ceremony, floating emotes all use `motion.div` with simple `animate={{ scale, opacity, ... }}`. No GSAP, no Lottie |
| **native WebSocket** | Browser-built-in WS API | Wrapped in `lib/ws.ts` with type-safe events + auto-reconnect. We don't need socket.io |

### Backend

| Tech | What it is | Why this one |
|---|---|---|
| **FastAPI** | Modern async Python web framework | Pydantic-validated request bodies, automatic OpenAPI/swagger at `/docs`, native asyncio support for our background workers + WebSockets |
| **SQLAlchemy 2** | Python ORM | Strong types, declarative models, migration-friendly. We use it both for queries and to let `Base.metadata.create_all()` auto-create tables on first boot |
| **Pydantic 2** | Data validation / serialization | FastAPI uses it for request bodies + response models. Catches malformed JSON at the edge, before any handler runs |
| **psycopg2-binary** | PostgreSQL driver | Standard, fast. The `-binary` variant bundles compiled bits so Render doesn't have to build from source ... usually |
| **httpx** | Async HTTP client | Used by the CF verdict poller to call `codeforces.com/api/user.status` without blocking the event loop |
| **uvicorn** | ASGI server | Runs FastAPI. We use `uvicorn[standard]` which bundles `websockets` and `watchfiles` |

### Database

| Tech | What it is | Why this one |
|---|---|---|
| **PostgreSQL 18** | Open-source relational database | Solid types, transactions, indexes, JSON columns. Render provides one with one click |
| **(Local dev) SQLite** | File-based DB | `db.py` switches automatically when `DATABASE_URL` is unset. Zero-config local dev |

### DevOps

| Tech | What it does |
|---|---|
| **GitHub** | Source of truth; both deploys auto-trigger on push |
| **Vercel** | Frontend hosting + auto-deploy from `feat/db-layer`/`main` |
| **Render** | Backend hosting + Postgres + auto-deploy + free SSL |
| **GitHub Actions** | CI: typecheck + tests + build on every push |

### ❓ Quiz — Stack

1. What does TypeScript's "discriminated union" give us specifically for WebSocket events?
2. Why use Zustand instead of Redux for this app?
3. What's the difference between TanStack Query and Zustand in terms of what they store?
4. Why `uvicorn` instead of `gunicorn` for a FastAPI app?
5. Why is the `psycopg2-binary` variant preferred over plain `psycopg2`?

---

## 3. Frontend deep dive

### The App Router model

Next.js 16's App Router uses a **file-system-as-routes** model with two key conventions:

- A `page.tsx` inside any folder becomes a route.
- A `layout.tsx` wraps everything below it (think nested templates).
- Folders in parentheses like `(marketing)` and `(app)` are **route groups** — they organize the file tree but don't show up in URLs.

Our structure:

```
app/
├── layout.tsx           ← root layout (loads fonts, providers)
├── globals.css
├── (marketing)/         ← public-facing surfaces
│   ├── layout.tsx       ← redirects to /play if logged in
│   ├── page.tsx         ← landing (/)
│   ├── leaderboard/page.tsx
│   └── u/[handle]/page.tsx
├── (app)/               ← auth-guarded surfaces
│   ├── layout.tsx       ← <AppShell> + auth check, redirects to /login
│   ├── play/page.tsx
│   ├── play/queue/page.tsx
│   ├── play/friend/page.tsx
│   ├── play/lobby/page.tsx
│   ├── play/async/page.tsx
│   ├── duel/[id]/page.tsx
│   ├── duel/[id]/spectate/page.tsx
│   ├── duel/[id]/replay/page.tsx
│   ├── duel/[id]/replay/opengraph-image.tsx
│   ├── profile/page.tsx
│   ├── profile/settings/page.tsx
│   └── quests/page.tsx
├── login/page.tsx
└── register/page.tsx
```

**Why two route groups?** Different layouts: marketing pages have no rail/topbar, app pages do. Without `(marketing)` and `(app)`, you'd have to put EVERY app page inside a `app/` folder which messes up your URL structure.

### Server components vs client components

In App Router, components are **server components by default**. They render on the server and produce HTML. They cannot use `useState`, `useEffect`, browser APIs, or WebSocket — none of that exists on the server.

To opt into a client component, put `"use client"` at the top of the file. Everything below that becomes a client component, runs in the browser, can hold state.

Our convention:
- Every page that needs interactivity (forms, hooks, WS) → `"use client"`
- Pure visual components (landing page hero, marketing copy) → server (no `"use client"`)
- Wrappers like `Providers` (TanStack Query, theme) → `"use client"` because they use React Context

```tsx
// app/(marketing)/page.tsx — SERVER component, no "use client"
import Link from "next/link";
export default function Landing() {
  return <main>...</main>;  // pure HTML, no state
}

// app/(app)/play/page.tsx — CLIENT component
"use client";
import { useAuth } from "@/stores/auth";
export default function PlayPage() {
  const user = useAuth(s => s.user);  // hooks need "use client"
  // ...
}
```

### State management — three layers

We use three different state mechanisms, each for a different kind of data:

| Where | Type of state | Lib |
|---|---|---|
| Component-local (form inputs, modal open/closed) | Ephemeral UI state | `useState` |
| App-wide client state (current user, active duel, WS connection) | Mutable session state | `Zustand` |
| Server-derived data (leaderboard, recent duels, quests) | Cached server state | `TanStack Query` |

**Why this split?** Don't shove server data into Zustand — TanStack Query handles caching, refetching, deduplication, and background revalidation for free. Don't shove UI state into Zustand — overkill for a single modal toggle.

### The TypeScript discriminated union for WebSocket events

The most TypeScript-y bit of code in the project:

```ts
// types/ws.ts
export type DuelEvent =
  | { type: "state";          payload: { state: Duel } }
  | { type: "verdict";        payload: { user_id, step_index, verdict, ... } }
  | { type: "step_advance";   payload: { user_id, new_step_index } }
  | { type: "duel_complete";  payload: { winner_id, elo_changes, ... } }
  | { type: "emote";          payload: { user_id, glyph, sent_at } }
  | { type: "system";         payload: { message: string } }
  | { type: "pong" };
```

This is a **discriminated union**: TypeScript can narrow the type based on the value of the `type` field. So when you write:

```ts
sock.on((ev) => {
  if (ev.type === "verdict") {
    // here, ev.payload is typed as { user_id, step_index, verdict, ... }
    // accessing ev.payload.winner_id would be a compile error
  }
  if (ev.type === "duel_complete") {
    // here, ev.payload.elo_changes is available
  }
});
```

**Why this matters**: it makes the event handler **exhaustive-checkable**. If you forget to handle a new event variant, TypeScript catches it. Way better than runtime `switch (ev.type)` with a default fallthrough.

### The auth store pattern

```ts
// stores/auth.ts
export const useAuth = create<State>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => { /* reads from localStorage */ },
  setSession: (token, user) => { /* writes to localStorage + state */ },
  refresh: async () => { /* re-fetches /auth/me */ },
  logout: () => { /* clears everything */ },
}));
```

Three things to notice:

1. **The store IS the API.** Components don't import any auth helper — they just use `useAuth(s => s.user)`. The store encapsulates all the localStorage / API logic.
2. **Selectors avoid unnecessary re-renders.** `useAuth(s => s.user)` only re-renders the component when `user` changes, not when any other field changes. That's a Zustand performance trick.
3. **`hydrate()` runs once on mount** because localStorage is browser-only. Server-side render produces `null`, client-side hydration fills it in.

### The WebSocket wrapper (`lib/ws.ts`)

```ts
export class TypedWS<E extends { type: string }> {
  connect()       // opens the socket, sets up listeners
  send(payload)   // sends JSON
  on(listener)    // subscribe to all events; returns unsubscribe
  close()         // intentional close — disables auto-reconnect
}
```

Key features:
- **Generic over event type** — `TypedWS<DuelEvent>` gives type-safe event listeners
- **Auto-reconnect with exponential backoff** — disconnect → wait 1s, 2s, 4s, 8s, capped at 10s
- **`intentionallyClosed` flag** so calling `.close()` doesn't trigger reconnect

### ❓ Quiz — Frontend

1. What's the difference between a server component and a client component? When MUST a component be a client component?
2. Why don't we put the leaderboard data in Zustand?
3. What does TypeScript's discriminated union enable for WebSocket events specifically? What happens if you forget to handle a new variant?
4. Why does `useAuth(s => s.user)` not cause re-renders when `token` changes?
5. What's the difference between `useEffect(...)` running and `"use client"` being needed?

---

## 4. Backend deep dive

### FastAPI: the request lifecycle

When you hit `POST /matchmaking/enqueue`:

```
1. Uvicorn receives the HTTP request
2. FastAPI matches the route to the handler function
3. For each `Depends(...)` parameter, FastAPI resolves the dependency:
   - `current_user: User = Depends(_get_current_user)` 
     → calls _get_current_user, which:
       → reads Authorization header
       → verifies JWT signature
       → queries DB for the user
       → returns the User object
   - `db: Session = Depends(get_db)` → opens a DB session, yields it
4. Pydantic validates the request body against `EnqueueRequest`
5. The handler function runs
6. Pydantic serializes the return value to JSON via `EnqueueResponse`
7. Database session closes (via the `finally:` in get_db)
8. HTTP response goes out
```

The whole thing is async-aware — `async def handler(...)` runs in the asyncio event loop, blocking I/O (like the DB query) doesn't block other requests.

### The route + service split

```
app/
├── api/routes/      ← HTTP handlers (thin)
│   ├── auth.py
│   ├── matchmaking.py
│   ├── friend_duel.py
│   └── ...
├── services/        ← business logic (thick)
│   ├── elo.py
│   ├── matchmaker.py        ← background worker
│   ├── cf_poller.py         ← background worker
│   ├── duel_completion.py
│   └── problem_picker.py
└── main.py          ← app setup, ws endpoints, glue
```

**Routes** validate input, call services, return responses. **Services** contain the actual logic. This is the "controller / service" split common in clean Python apps.

Example — `POST /matchmaking/enqueue`:

```python
# api/routes/matchmaking.py — handler is tiny
@router.post("/enqueue", response_model=EnqueueResponse)
def enqueue(
    payload: EnqueueRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.cf_handle:
        raise HTTPException(400, "Link your CF handle to play.")
    if not _check_rate_limit(current_user.id):
        raise HTTPException(429, "Too many queue enqueues.")
    # Insert a row in matchmaking_queue. The matchmaker worker picks it up.
    entry = MatchmakingQueueEntry(...)
    db.add(entry); db.commit()
    return EnqueueResponse(queue_id=entry.id, eta_seconds=30)
```

The handler just **enqueues** the request. The actual matching happens in `services/matchmaker.py`, which is a forever-loop running in the background.

### Background workers (the matchmaker + CF poller)

These are the most distinctive bit of the backend. They're **infinite async loops** spawned at app startup:

```python
# main.py
_background_tasks: list[asyncio.Task] = []

@app.on_event("startup")
async def _start_workers():
    seed_quests(...)
    _background_tasks.append(asyncio.create_task(run_matchmaker_loop()))
    _background_tasks.append(asyncio.create_task(run_cf_poller_loop()))

@app.on_event("shutdown")
async def _stop_workers():
    for t in _background_tasks: t.cancel()
```

And each loop looks like:

```python
# services/matchmaker.py
async def run_matchmaker_loop():
    while True:
        try:
            await _tick()                # scan queue, pair users
        except Exception:
            log.exception("matchmaker tick error")
        await asyncio.sleep(TICK_SECONDS)  # 1 second
```

**Why this pattern works**: FastAPI uses `asyncio`, and `asyncio.create_task` runs a coroutine concurrently with everything else. The matchmaker loop and CF poller loop run alongside HTTP request handlers, all in the same event loop, all sharing the same DB.

**Why this requires a long-lived server**: Vercel functions die after each request. The matchmaker loop would never get a chance to run. You need a process that stays alive — that's Render.

### Pydantic for validation

```python
class EnqueueRequest(BaseModel):
    mode: str = "speedrun_ladder"
    deck_tags: Optional[List[str]] = None
```

When this is on a FastAPI handler parameter, FastAPI automatically:
- Reads the request body as JSON
- Validates it against the schema
- Returns a 422 with a precise error if validation fails
- Passes you the typed Python object

Same for response models — `response_model=EnqueueResponse` means the handler's return value is serialized through the Pydantic model, guaranteeing the response shape.

### ❓ Quiz — Backend

1. What's the difference between a "route" and a "service" in this codebase?
2. Why does the matchmaker have to be a background asyncio task and not an HTTP endpoint?
3. What does `Depends(...)` do in FastAPI? Walk through what happens when a handler has `db: Session = Depends(get_db)`.
4. If I wanted to add a new endpoint `GET /me/avatar`, what's the minimum I'd add (files + line count)?
5. What happens to the matchmaker loop if Render shuts down the container?

---

## 5. Database & data model

### The ORM: SQLAlchemy declarative models

Models are Python classes that inherit from `Base`. SQLAlchemy reads their column definitions and can:
- Generate the SQL schema (`Base.metadata.create_all(bind=engine)`)
- Issue queries via Python expressions (`db.query(User).filter(User.elo > 1500)`)
- Track changes and commit them atomically

```python
class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    elo = Column(Integer, default=1200, nullable=False)
    cf_handle = Column(String(100), nullable=True, index=True)
    timezone = Column(String(64), nullable=True)
    # ...
```

### The full schema

19 tables. Conceptually grouped:

**Identity:**
- `users` — accounts, ELO, CF handle, XP, timezone, etc.
- `solved_problems` — cache of which CF problems each user already AC'd (used by problem picker to avoid serving already-solved problems)

**Duel-core:**
- `duels` — one row per duel; status (active/complete/archived), winner, time cap
- `duel_participants` — many-to-many user↔duel, with current_rating snapshot
- `duel_steps` — five rows per speedrun-ladder duel; problem + per-side status
- `submissions` — legacy; new flow doesn't write to it (CF is the judge)
- `elo_history` — every ELO change, with before/after/delta/result/opponent

**Matchmaking:**
- `matchmaking_queue` — one row per user currently in queue; ELO at enqueue time, deck override
- `friend_rooms` — host's private room with 6-char code, expiry, status

**Gamification:**
- `streaks` — current/longest counts, last duel local date, shields, timezone
- `quests` — quest templates (10 seeded)
- `quest_progress` — per-user per-day progress + completion + claim status
- `decks` — user's saved 3 algorithm tags
- `cosmetic_unlocks` — what banners/glyphs a user owns
- `equipped_cosmetics` — what they currently have on
- `replay_events` — every WS event written for post-duel replay
- `async_challenges` — sender vs recipient, problem seed, attempt results

**Legacy / unused:**
- `rooms`, `chat_messages`, `practice_sheet_items`, `problems` — kept for the practice flow

### Why UUID primary keys for `users`?

```python
id = Column(String(36), primary_key=True, default=generate_uuid)
```

Three reasons:
1. **Stable across DB resets.** Auto-increment integers reuse IDs after wipes; UUIDs don't.
2. **Safe in URLs.** A username could be ambiguous; a UUID is unambiguous.
3. **Allows JWTs to embed user ID safely.** The JWT contains the UUID; you can verify the user without exposing sequential IDs.

### Indexes

We index columns that show up in `WHERE` clauses or `ORDER BY`:

```python
username = Column(String(50), unique=True, nullable=False, index=True)
cf_handle = Column(String(100), nullable=True, index=True)
duel_id = Column(String(36), ForeignKey("duels.id"), nullable=False, index=True)
```

Without indexes, queries like `db.query(User).filter(User.username == "saksham")` would scan every row. With an index, it's a hash lookup. On a 100k-user table the difference is 100ms → 1ms.

### Foreign keys + cascade delete

```python
class DuelStep(Base):
    duel_id = Column(String(36), ForeignKey("duels.id"), nullable=False, index=True)

class Duel(Base):
    steps = relationship("DuelStep", back_populates="duel", cascade="all, delete-orphan")
```

`cascade="all, delete-orphan"` means: if you delete a Duel, all its DuelStep rows are deleted automatically. Without this, you'd have to manually delete the children, or hit a foreign-key constraint error.

### The "naive ISO timestamp" gotcha

A subtle bug we already fixed: `datetime.utcnow()` returns a **naive** datetime (no timezone info). When you serialize via `.isoformat()`, you get `"2026-05-30T13:53:38.961074"` — no `Z`, no `+00:00`. JavaScript's `new Date("...")` then parses it as **local time**, so the frontend timer was broken on any non-UTC client.

Fix: a helper that appends `Z`:

```python
def iso_utc(dt):
    if dt is None: return None
    s = dt.isoformat()
    if s.endswith("Z") or ...: return s
    return s + "Z"
```

**Lesson**: always serialize datetimes with explicit timezone info. Better yet, store timezone-aware datetimes in the DB to begin with.

### Migrations? We skipped them.

We use `Base.metadata.create_all(bind=engine)` at app startup, which:
- Creates any **new** tables
- Adds any **new** indexes
- **Does NOT alter existing tables** (so adding a column to `User` requires either a manual ALTER or wiping the DB)

This is fine for solo dev but bad practice for production. The proper tool is **Alembic**, which generates SQL migration scripts (UP and DOWN) tracked in git.

### ❓ Quiz — Database

1. Why UUID primary keys for `users` instead of auto-increment integers?
2. What does `cascade="all, delete-orphan"` do? What goes wrong if you remove it?
3. What's a "naive datetime" in Python? Why did it break our timer?
4. What does `Base.metadata.create_all()` do, and what does it NOT do?
5. If I added a `User.bio` text column, what would I need to do to deploy it safely without losing data?

---

## 6. Authentication (JWT)

### What a JWT is

A JSON Web Token is `header.payload.signature` — three base64-encoded chunks separated by dots. Ours is simplified to just `payload.signature`:

```
eyJzdWIiOiJiYzQ4ZmIxMi00ZDE1...   .   c4f7a92d8e3...
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^         ^^^^^^^^^^^^
base64({"sub":"<user_id>",            HMAC-SHA256 of
       "username":"...",              the payload, with
       "exp":1780180000})              SECRET_KEY
```

The payload is signed with a secret key only the backend knows. The backend can verify a token by recomputing the HMAC and comparing — if anyone tampers with the payload, the signature won't match.

### How our auth flow works

1. **Register** → backend hashes the password (SHA-256) and stores the user
2. **Login** → backend verifies the password hash, issues a JWT, returns it
3. **Frontend stores it in `localStorage`** as `ca_token`
4. **Every subsequent request** sends `Authorization: Bearer <jwt>`
5. **Backend's `_get_current_user` dependency** verifies the JWT, looks up the user, returns the User object
6. **Logout** = just delete the localStorage entry

```python
# api/routes/auth.py
def create_token(user_id, username):
    payload = {
        "sub": user_id,
        "username": username,
        "exp": int(time.time()) + (24 * 3600),
    }
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"

def verify_token(token):
    body, sig = token.split(".", 1)
    if not hmac.compare_digest(sig, _sign(body)): return None
    payload = json.loads(base64.urlsafe_b64decode(body + padding))
    if payload["exp"] < time.time(): return None
    return payload["sub"]
```

**Why we use `hmac.compare_digest`** instead of `==`: prevents **timing attacks**. A naive `==` comparison short-circuits on the first mismatched byte, which leaks info about how many bytes matched. `compare_digest` runs in constant time.

### The "stale token" problem we hit

Scenario: user registers when backend was on SQLite → gets a JWT → we switch backend to Postgres (empty DB) → user's JWT still verifies (signature valid, not expired) but the `user_id` it references doesn't exist in Postgres.

Old behavior: backend returned 404 "User not found", frontend interceptor only handled 401, user was stuck.

Fix: return 401 "Session expired" when the user is missing. Frontend interceptor catches it → wipes localStorage → redirects to `/login?reason=session_expired` → friendly banner explains.

**Lesson**: think about every failure mode. A valid-but-orphaned token IS a failed authentication.

### Why JWT vs session cookies?

| | JWT | Session cookie |
|---|---|---|
| Server state | None (stateless) | Server stores session |
| Scale | Easy — no shared session store | Harder — need shared store (Redis) across replicas |
| Revocation | Hard — JWTs are valid until expiry | Easy — delete the session |
| Mobile / API | Natural fit | Tricky |

We chose JWT because (1) it's stateless so we don't need Redis, (2) it works identically for the web app and any future mobile client. The "revocation" downside doesn't matter much for us — we set a 24h expiry and accept it.

### ❓ Quiz — Auth

1. What's inside a JWT and what makes it tamper-proof?
2. Why use `hmac.compare_digest` instead of `==`?
3. What's the "stale token" bug we hit, and why did 404 → 401 fix it?
4. If you wanted to "force-log-out all users right now", how would you do it with JWT? (Hint: there's no DELETE for JWTs.)
5. What's the trade-off between JWT and session cookies?

---

## 7. Matchmaking algorithm

### The problem

When a user clicks "Enter arena", we need to pair them with another player at a similar skill level — within seconds, with no central scheduler, with no priority lock-ins.

### Our model: pull-based queue + 1-second tick

```python
# services/matchmaker.py
TICK_SECONDS = 1.0
INITIAL_WINDOW = 150       # ±150 ELO at start
WIDEN_WINDOWS = [(60, 300), (120, 500)]  # at 60s queued, expand to ±300; at 120s, ±500

async def run_matchmaker_loop():
    while True:
        await _tick()
        await asyncio.sleep(TICK_SECONDS)

async def _tick():
    entries = db.query(MatchmakingQueueEntry).order_by(enqueued_at.asc()).all()
    paired = set()
    for entry in entries:
        if entry.id in paired: continue
        opp = _find_match(db, entry)
        if not opp or opp.id in paired: continue
        duel = _start_duel(db, entry, opp)
        paired.add(entry.id); paired.add(opp.id)
        await hub.broadcast("queue", entry.user_id, {match_found})
        await hub.broadcast("queue", opp.user_id, {match_found})
```

### The window-expansion idea

Best-effort pairing within ±150 ELO at first. If someone's been queued >60s without a match, broaden their acceptable window to ±300. After 120s, ±500. So eventually you DO match, but the system prefers high-quality matches when there's choice.

```python
def _window_for(entry):
    age = (datetime.utcnow() - entry.enqueued_at).total_seconds()
    window = INITIAL_WINDOW
    for threshold, w in WIDEN_WINDOWS:
        if age >= threshold:
            window = w
    return window
```

### When a match happens

`_start_duel(db, entry, opp)` does a lot in one transaction:

1. Picks 5 problems via `pick_ladder()` based on lower-rated player's ELO
2. Creates the `Duel` row with `status="active"`, `started_at=utcnow()`
3. Creates 5 `DuelStep` rows (one per problem) with `pending` status both sides
4. Creates 2 `DuelParticipant` rows
5. Deletes both `MatchmakingQueueEntry` rows
6. Commits the transaction (all-or-nothing)
7. Broadcasts `match_found` over each user's queue WebSocket

Both frontends receive `match_found` with `{duel_id, opponent}` → play the arena-entrance transition → navigate to `/duel/[id]`.

### Why this model is good

- **No locks.** The tick is single-threaded (one asyncio coroutine) so there's no race between "find opp" and "create duel".
- **Pull-based.** Players enqueue and forget; the matchmaker pulls when ready. Vs push-based, where each enqueue would trigger a search immediately — fine for low traffic, complex for spikes.
- **Latency floor of 1s.** Acceptable. Even Clash Royale takes 5-10s to match. You'd reduce TICK_SECONDS to 0.5 if needed.
- **Fair ordering.** `ORDER BY enqueued_at ASC` means the oldest queued player gets first dibs.

### What it doesn't do (yet)

- **No skill prediction.** We use raw ELO, not glicko / TrueSkill which model uncertainty.
- **No region matching.** Players in India playing players in Brazil = high latency. We'd need geo info on the queue entry.
- **No "anti-camping"** — a high-ELO player could queue, wait long enough for ±500 window to expand, then steamroll a low-ELO player. The smurf-check in `complete_duel` partially addresses this.

### ❓ Quiz — Matchmaking

1. Why does the matchmaker have a single 1-second tick instead of running on every enqueue?
2. What does "window expansion" mean and why does it help?
3. Walk through what happens in the DB transaction inside `_start_duel`. What's atomic about it?
4. If two users enqueue at exactly the same time at the same ELO, who matches first?
5. How could you add region awareness to the matcher without rewriting it?

---

## 8. ELO math

### The intuition

ELO is a rating system that tells you the expected probability of A beating B, based on their ratings. After each game, both ratings update based on whether the actual outcome matched the expectation.

- If you beat someone much higher-rated → big rating gain
- If you beat someone much lower-rated → tiny gain
- If you lose to someone much higher-rated → tiny loss
- If you lose to someone much lower-rated → big loss

### The formula

```
expected = 1 / (1 + 10^((opp_elo - my_elo) / 400))
actual = 1 if I won, 0 if I lost, 0.5 if draw
delta = round(K × (actual - expected))
```

`K` is the "K-factor" — it controls how much ratings move per game. Higher K = ratings swing more.

### Our implementation

```python
# services/elo.py
def expected_score(my_elo, opp_elo):
    return 1.0 / (1.0 + 10 ** ((opp_elo - my_elo) / 400.0))

def elo_delta(my_elo, opp_elo, result):
    k = tier_for_elo(my_elo).k_factor
    actual = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
    return round(k * (actual - expected_score(my_elo, opp_elo)))
```

### Tier-scaled K-factor

We make K depend on the player's tier:

| Tier | K |
|---|---|
| Bronze, Silver | 40 |
| Gold, Platinum | 32 |
| Diamond | 24 |
| Master, Legend | 16 |

**Why this curve**: at low tiers, players need rating to move fast — they're still finding their level. At high tiers, you want stability so the leaderboard doesn't churn wildly.

### A worked example

Two players, both at ELO 1500 (Gold, K=32):

```
expected = 1 / (1 + 10^0) = 0.5
delta(win) = round(32 × (1 - 0.5)) = 16
delta(loss) = round(32 × (0 - 0.5)) = -16
delta(draw) = round(32 × (0.5 - 0.5)) = 0
```

Same ratings → expected 50/50 → ±16 swing.

Upset case: Bronze player (800) beats Diamond (2000):

```
expected_for_bronze = 1 / (1 + 10^((2000-800)/400)) = 1 / (1 + 10^3) ≈ 0.001
delta_for_bronze(win) = round(40 × (1 - 0.001)) = 40

expected_for_diamond = 1 / (1 + 10^((800-2000)/400)) = 1 / (1 + 10^-3) ≈ 0.999
delta_for_diamond(loss) = round(24 × (0 - 0.999)) = -24
```

The Bronze player gains 40 ELO (huge upset!). The Diamond loses 24 (their tier-K is lower, so they don't get punished as hard).

### Why ELO works as a system

- **Self-balancing.** If you're under-rated, you'll keep winning and gain rating until you reach your true skill level.
- **Skill-symmetric**. Winning against a peer = small gain. Winning against someone much weaker = ~0 gain. Beating someone much stronger = large gain.
- **Zero-sum (kind of).** Total ELO across the system is conserved on draws but slightly inflates/deflates with the K-difference, which is mostly noise.

### ❓ Quiz — ELO

1. What does the expected_score function tell you in plain English?
2. If you have ELO 1800 and lose to ELO 1200, how do you feel? Show the delta math.
3. Why is K-factor smaller at higher tiers? What goes wrong if Master tier had K=40?
4. Is total ELO conserved across the whole leaderboard? Why or why not?
5. What's the difference between ELO and Glicko? (Quick search; relevant to "what would you do next".)

---

## 9. Codeforces verdict polling

### The problem

A player submits on Codeforces. Our backend needs to detect AC verdicts and update the duel HUD in real time. But CF doesn't push us anything — we have to poll.

### The architecture

```python
# services/cf_poller.py
TICK_SECONDS = 3.0
PER_HANDLE_MIN_INTERVAL = 1.1   # CF rate limit safety
BACKOFF_INITIAL = 5.0
BACKOFF_MAX = 60.0

async def run_cf_poller_loop():
    while True:
        db = next(get_db())
        try:
            duels = db.query(Duel).filter(Duel.status == "active").all()
            for d in duels:
                await _process_duel(db, d)
        finally:
            db.close()
        await asyncio.sleep(TICK_SECONDS)

async def _process_duel(db, duel):
    parts = participants(duel)
    for part in parts:
        user = ...
        if not user.cf_handle: continue
        current = _current_step(db, duel, user.id)
        if not current: continue
        submissions = await _fetch_status(user.cf_handle)
        for sub in submissions:
            if sub.creationTimeSeconds < duel.started_at: continue
            if sub.problem != current.problem: continue
            verdict = map_cf_verdict(sub.verdict)
            await hub.broadcast("duel", duel.id, {"type": "verdict", ...})
            if verdict == "AC":
                mark_step_solved()
                await hub.broadcast(...)
                if all_steps_solved: await complete_duel(...)
```

### Three key engineering details

**1. Per-handle minimum interval (1.1s)**

CF's rate limit is documented as 1 request per second per handle. If you exceed it they return 429 or sometimes a 503. We track the last call time per handle:

```python
_last_call: dict[str, float] = {}
if now - _last_call.get(handle, 0) < PER_HANDLE_MIN_INTERVAL:
    return None  # skip this tick for this handle
_last_call[handle] = time.time()
```

So even with the 3-second outer tick, we never accidentally double-poll if a CF call took a long time.

**2. Exponential backoff on errors**

When CF returns 429 or 5xx, we don't keep hammering. Instead, we mark that handle as "backed off until time T":

```python
_backoff_until: dict[str, float] = {}
if now < _backoff_until.get(handle, 0):
    return None  # still in backoff, skip
# on error:
_backoff_until[handle] = time.time() + min(BACKOFF_MAX, current_backoff * 2)
```

Backoff starts at 5s, doubles per failure, capped at 60s.

**3. Last-seen submission tracking**

We don't want to re-process the same submission every tick. We track the last seen submission ID per `(handle, duel)` pair:

```python
_last_seen_submission: dict[str, int] = {}
cache_key = f"{user.cf_handle}:{duel.id}"
if sub_id <= _last_seen_submission.get(cache_key, 0):
    continue  # already processed
_last_seen_submission[cache_key] = sub_id
```

CF returns submissions in REVERSE chronological order (newest first), so we iterate `reversed(submissions)` to process oldest-first.

### Why polling instead of pushing?

CF doesn't expose a push mechanism — no webhook, no WebSocket, no SSE. Polling is the only option. The right tradeoff is "poll often enough to feel responsive, but not so often you get rate-limited".

3 seconds × per-handle 1.1s interval = each player's submissions checked roughly every 3 seconds, which feels nearly instant from a UX perspective.

### Failure modes & how we handle them

| Failure | What we do |
|---|---|
| CF returns 429 | Exponential backoff (5s → 10s → 20s → ... → 60s max) per handle |
| CF returns 5xx | Same — treat as transient, backoff |
| CF returns 200 but `status != "OK"` | Treat as soft failure, retry next tick |
| Network timeout (8s) | Skip this handle for 10s, retry |
| User has no CF handle | Silently skip |
| Duel has no participants | Skip |
| Submission for old / wrong problem | Filtered out by `creationTimeSeconds >= duel.started_at` + problem-match check |

### The data flow on a verdict event

```
Player submits "1234A" on Codeforces
  ↓ (3s later, CF poller tick)
GET https://codeforces.com/api/user.status?handle=saksham&from=1&count=10
  ↓ (we get a JSON list of submissions)
filter: creationTime >= duel.started_at AND problem matches current step
  ↓
new submission detected, verdict = "WRONG_ANSWER", testset = 3
  ↓
hub.broadcast("duel", duel_id, {"type": "verdict", "payload": {...}})
  ↓ (WebSocket fanout)
All clients on /ws/duel/{id} receive the event
  ↓
useDuel store handler updates `duel.host.last_verdict`
  ↓
React re-renders OpponentPanel with a flashing WA pill
```

End-to-end latency from CF submit → HUD update ≈ 3-5 seconds.

### ❓ Quiz — CF poller

1. Why do we poll instead of CF pushing to us?
2. What's the difference between TICK_SECONDS (3s) and PER_HANDLE_MIN_INTERVAL (1.1s)? When does each fire?
3. What happens if CF is down for 5 minutes — does our backend break?
4. How do we ensure we don't double-process the same submission?
5. Why filter by `creationTimeSeconds >= duel.started_at`? What would go wrong otherwise?

---

## 10. Realtime: the WebSocket layer

### The three channels

```
/ws/queue/{user_id}    — broadcasts queue_tick + match_found to that user
/ws/duel/{duel_id}     — broadcasts verdict + step_advance + duel_complete + emote
/ws/user/{user_id}     — broadcasts friend_duel_started (used by friend-duel host page)
```

### The `WSHub` pattern

The hub is a tiny in-memory pub/sub:

```python
# services/ws_hub.py
class WSHub:
    def __init__(self):
        self._subscribers: dict[tuple[str, str], set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, kind, ident, ws):
        async with self._lock:
            self._subscribers[(kind, ident)].add(ws)

    async def unsubscribe(self, kind, ident, ws):
        async with self._lock:
            self._subscribers[(kind, ident)].discard(ws)
            if not self._subscribers[(kind, ident)]:
                self._subscribers.pop((kind, ident), None)

    async def broadcast(self, kind, ident, message):
        sockets = list(self._subscribers.get((kind, ident), ()))
        for ws in sockets:
            try: await ws.send_text(json.dumps(message))
            except: pass  # client cleanup on its own
```

**Why a hub** — instead of giving each subsystem its own connection registry, everyone broadcasts through the hub. So `duel_completion.py` doesn't need to know about WebSockets — it just calls `hub.broadcast("duel", duel_id, {...})`.

### The WS endpoint pattern

Each WS endpoint follows the same shape:

```python
@app.websocket("/ws/duel/{duel_id}")
async def duel_ws(websocket, duel_id):
    await websocket.accept()                          # 1. handshake
    await hub.subscribe("duel", duel_id, websocket)   # 2. register
    try:
        # 3. send initial state
        await websocket.send_json({"type": "state", ...})
        # 4. listen for client messages (emotes, pings)
        while True:
            msg = await websocket.receive_text()
            # handle inbound messages
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe("duel", duel_id, websocket)
```

### Why the hub uses `asyncio.Lock`

In Python asyncio, two coroutines can both be in the middle of `subscribe()` at the same time (one yielding during the dict add). The lock prevents the underlying dict from getting corrupted by concurrent modifications.

In practice, with one event loop, the only concurrency hazard is cooperative — you mostly don't need this. But it's cheap insurance.

### Limitations of in-memory pub/sub

If you ever scale to multiple Render instances (you'd pay for that), the WSHub stops working — instance A's broadcast doesn't reach a WebSocket on instance B. You'd need Redis pub/sub or NATS or similar to bridge instances.

We don't have that problem because Render free tier runs one instance. If you ever pay for scaling, swap WSHub for a Redis-backed version (~50 lines of code).

### Frontend WebSocket lifecycle

```ts
// stores/duel.ts
connect(duelId) {
  const sock = new TypedWS<DuelEvent>(wsUrl(`/ws/duel/${duelId}`));
  sock.on((ev) => {
    if (ev.type === "verdict") { /* update store */ }
    if (ev.type === "step_advance") { /* update store */ }
    // ...
  });
  sock.connect();
  set({ socket: sock });
}

disconnect() {
  get().socket?.close();  // intentionallyClosed = true → no reconnect
}
```

The `TypedWS` wrapper has auto-reconnect with exponential backoff, so a transient network blip won't kick the user out of the duel.

### ❓ Quiz — WebSockets

1. Why use WebSockets instead of polling for the duel HUD?
2. What does the WSHub abstract away from the rest of the backend?
3. If you spun up a second Render instance, what would break and why?
4. Why does the frontend WS wrapper need a `intentionallyClosed` flag?
5. Trace what happens (start to finish) when player A solves their current step.

---

## 11. Friend duels & async challenges

### Friend duel flow

```
HOST                            BACKEND                      JOINER
────                            ───────                      ──────
POST /friend-duel
{rating_preset: "medium"}
→                          create FriendRoom
                           generate 6-char code
                           ← {code: "Q46QI3", id: ...}

OPEN ws://.../ws/user/{host_id}
(listening for friend_duel_started)
                                                            POST /friend-duel/join
                                                            {code: "Q46QI3"}
                                                            →
                                                  validate room exists + waiting
                                                  pick 5 problems (preset curve)
                                                  create Duel + DuelSteps + 2 Participants
                                                  delete room
                                                  ← {duel_id: "..."}
                            hub.broadcast(
                              "user", host_id,
                              {type:"friend_duel_started",
                               payload:{duel_id, opponent}}
                            )
                                                            navigate to /duel/{id}
←  friend_duel_started arrives via WS
navigate to /duel/{id}
```

**Why a WS push for the host instead of polling**: the host's page is just waiting around. A WebSocket lets us push the moment the joiner joins, no polling needed.

**Why rating presets** instead of asking the host to specify 5 numbers:

| preset | step ratings (relative to base ELO) |
|---|---|
| chill | -300, -200, -100, 0, +100 |
| medium | -200, -100, 0, +100, +200 |
| hard | -100, 0, +100, +200, +300 |

This gives the host meaningful control without UI complexity.

### Async challenge flow

This one's different — no synchronous duel. Two separate attempts compared.

```
SENDER                           BACKEND                      RECIPIENT
──────                           ───────                      ─────────
POST /async-challenge
{recipient_username: "bob"}
→
                          generate 5-problem seed
                          create AsyncChallenge
                          sender_started_at = now
                          status = "sent"
                          ← {challenge_id, problem_seed: [...]}

(sender plays for 90 min,
 self-reports via UI)
POST /async-challenge/{id}/submit
{steps_cleared: 4, duration_s: 1830}
→
                          status = "sender_done"
                          sender_steps_cleared = 4
                          sender_finished_at = now
                                                            GET /async-challenge/inbox
                                                            (sees pending challenge)
                                                            →
                                                            POST /async-challenge/{id}/accept
                                                            recipient_started_at = now
                                                            status = "accepted"

                                                            (plays for 90 min)
                                                            POST /async-challenge/{id}/submit
                                                            {steps_cleared: 5, duration_s: 2100}
                          recipient_steps_cleared = 5
                          status = "complete"
                          winner = bob (more steps)
                          ← {complete, winner_id}
```

**Why self-reporting?** A real implementation would run the CF poller against the recipient's handle during their 90-min window and auto-fill `steps_cleared`. We took the shortcut. Trust-based for now.

### ❓ Quiz — Friend / async

1. Why does the friend duel use WebSocket to notify the host instead of having the host poll?
2. What does the `FriendRoom` table buy you over passing data directly between client and join endpoint?
3. Why are presets (chill/medium/hard) better UX than letting the host pick exact step ratings?
4. The async challenge is "self-reported." What attack vector does that create?
5. How would you change the async flow to use the CF poller for auto-verification?

---

## 12. Streaks, quests, cosmetics, decks

### Streaks

Streak = consecutive **days** with at least one ranked duel. Reset at user-local midnight. With shields that absorb one missed day.

```python
# services/streak.py
def tick_streak(db, user, completion_dt_utc):
    today = _local_date(completion_dt_utc, user.timezone)
    row = _get_or_create(db, user.id, user.timezone)

    if row.last_duel_local_date is None:
        row.current_count = 1
    else:
        gap = _days_between(row.last_duel_local_date, today)
        if gap == 0:                # same day, no change
            pass
        elif gap == 1:              # next day, increment
            row.current_count += 1
        else:                       # missed days
            missed = gap - 1
            if row.shields_remaining >= missed:
                row.shields_remaining -= missed
                row.current_count += 1
            else:
                row.current_count = 1   # streak broken, restart at 1

    # Award 1 shield on first 7-day streak
    if row.current_count == 7:
        row.shields_remaining += 1

    row.last_duel_local_date = today
```

**The clever bit**: timezone-aware. A user in IST who plays at 23:55 IST and again at 00:30 IST the next day → that's two consecutive days for them. The `_local_date` helper handles this.

### Quests

10 seeded templates, 3 daily + 1 weekly per user. Rule types:

- `wins` — N wins today
- `clear_rating` — clear a step at rating ≥ X
- `win_no_wa` — win a duel with zero wrong submissions
- `win_under_seconds` — win a duel under T seconds
- `win_vs_higher_elo` — beat someone higher-rated than you
- `streak_reach` — current streak ≥ N

Stable per-user-per-day selection: hash `(user_id, date, quest_slug)` to pick which 3 daily quests this user gets today. **Idempotent** — re-running roll_today_for(user) doesn't re-roll, because the rows already exist with `rolled_for_date = today`.

```python
def _stable_pick(pool, n, salt):
    seeds = sorted(pool,
        key=lambda q: hashlib.sha1(f"{user.id}:{salt}:{q.slug}".encode()).hexdigest())
    return seeds[:n]
```

### Cosmetics

Two axes: **banner** (background) and **glyph** (avatar character). 6 of each. Unlocks driven by tier:

```python
BANNERS = {
  "default": {"unlock": "default"},
  "pink-haze": {"unlock": "tier:SILVER"},
  "cyan-grid": {"unlock": "tier:GOLD"},
  "violet-storm": {"unlock": "tier:PLATINUM"},
  "gold-rush": {"unlock": "tier:DIAMOND"},
  "rainbow": {"unlock": "tier:MASTER"},
}
```

When the user loads `/cosmetics/me`, the backend computes which they qualify for based on current ELO, idempotently inserts them into `cosmetic_unlocks`, then returns the full list with `owned: true/false`. Pure progression unlocks — no shop, no purchases.

### Decks

User picks up to 3 algorithm tags (`dp`, `graphs`, `greedy`, etc.). The problem picker uses the **intersection** of both players' decks when picking problems for a duel:

```python
def pick_ladder(base_elo, deck_tags, ...):
    for target in step_ratings_for_elo(base_elo):
        candidates = [p for p in pool if abs(p.rating - target) <= 50]
        if deck_tags:
            tagged = [p for p in candidates if any(t in deck_tags for t in p.tags)]
            if tagged: candidates = tagged   # only use deck-filtered if non-empty
        choice = rng.choice(candidates)
        chosen.append(choice)
```

So if both players' decks contain `dp`, you get dp-heavy problems. Falls back to unrestricted if intersection is empty (no surprise empty-ladder errors).

### ❓ Quiz — gamification

1. Why does the streak system need to be timezone-aware? What breaks if it's not?
2. What does "idempotent roll" mean for quests, and why does it matter?
3. Why do quests use a stable hash to pick which ones a user gets each day?
4. How do cosmetics auto-unlock without an explicit "claim" step?
5. What's the difference between using deck-tag intersection vs union when picking problems?

---

## 13. Deployment & DevOps

### The two cloud providers, again

| | Render | Vercel |
|---|---|---|
| Hosts | Backend + Postgres | Frontend |
| Triggered by | `git push origin main` | Same |
| Free tier limits | Sleeps after 15 min idle; cold-start ~30s; 90-day Postgres lifetime | Unlimited deploys; 100 GB bandwidth/mo; preview deploys per branch |
| Build environment | Docker (`backend/Dockerfile`) | Node 20, `next build` |

### How auto-deploy works

```
git push origin main
   ↓
GitHub fires webhook → Render (notified)
                    → Vercel (notified)
                    ↓
   Render pulls latest, runs Dockerfile build, restarts container
   Vercel pulls latest, runs `next build`, swaps the CDN
```

Each provider handles its half independently. No coordination — both watch the same branch, both rebuild on push.

### The render.yaml Blueprint

```yaml
services:
  - type: web
    name: codearena-backend
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: codearena-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true

databases:
  - name: codearena-db
    plan: free
    databaseName: codearena
```

This single file tells Render: "provision one web service + one Postgres, wire the DB's connection string into the service as DATABASE_URL, generate a random SECRET_KEY". One click — `New → Blueprint`.

### The vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "git": {
    "deploymentEnabled": {
      "feat/db-layer": true
    }
  }
}
```

Tells Vercel: "this is a Next.js project, build with `next build`, only auto-deploy `feat/db-layer` branch" (we also have `main`).

### Environment variables — the source of truth

- **Render backend** has: `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL` (for CORS), `PYTHON_VERSION`
- **Vercel frontend** has: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL`
- **Local dev** has the same names in `frontend/.env.local` and via shell env

The `NEXT_PUBLIC_` prefix is required by Next.js to expose env vars to the browser bundle (otherwise they're server-only).

### CORS — the cross-origin gate

Browser security says: a page on `code-arena-2026.vercel.app` cannot make XHR/fetch requests to `codearena-backend-f05o.onrender.com` unless the backend explicitly allows it via `Access-Control-Allow-Origin` headers.

Our backend's CORS config:

```python
allowed_origins = list(default_origins) + [FRONTEND_URL, ...CORS_ORIGINS]
_allow_origin_regex = r"https://.*\.vercel\.app$"   # all vercel preview deploys

app.add_middleware(CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The regex is the magic — every Vercel PR/branch deploy gets its own subdomain and `*.vercel.app` matches them all.

### GitHub Actions CI

Pure validation — typecheck + tests + build on every push, on both branches:

```yaml
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci         (in frontend/)
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build

  backend:
    similar shape: setup-python 3.11, pip install, pytest, import-check
```

CI doesn't deploy — Vercel + Render do that. CI just gives you a green checkmark per PR meaning "this commit is shippable".

### ❓ Quiz — deployment

1. What's the difference between Vercel and Render — why do we use both?
2. Why does `NEXT_PUBLIC_API_BASE_URL` need that prefix?
3. What does the CORS regex `https://.*\.vercel\.app$` enable?
4. If you wanted to add a third environment (staging.codearena.dev), what would you need to change?
5. What does GitHub Actions CI check that Vercel + Render don't?

---

## 14. Design patterns used

### 1. **Pull-based queue with a tick**
*(matchmaker, CF poller)*
- One coroutine loops forever, sleeps between iterations, processes work
- Pros: simple, no concurrency hazards, easy to reason about
- Cons: latency floor of `tick_seconds`; needs a long-lived process

### 2. **Discriminated unions**
*(WebSocket events)*
- TypeScript type narrowing via a `type` discriminator field
- Pros: compile-time exhaustiveness, refactor-safe
- Cons: requires being all-in on the pattern; old code that uses `any` breaks the safety

### 3. **Stale-while-revalidate**
*(TanStack Query default)*
- Show cached data immediately, fetch fresh in background, swap when ready
- Pros: instant UX, eventual consistency
- Cons: brief flicker between stale and fresh in edge cases

### 4. **Pub/sub hub with channels**
*(WSHub)*
- A central registry of subscribers keyed by (kind, id), anyone can broadcast
- Pros: decouples producers from consumers
- Cons: in-memory only — doesn't scale across instances

### 5. **Pure functions for game math**
*(elo.py, streak.py)*
- Math lives in stateless functions that take args and return values
- Pros: trivially testable, deterministic
- Cons: occasionally need to thread DB through

### 6. **Optimistic local state + server reconciliation**
*(duel store after WS verdict)*
- Apply the change locally first (instant feedback), trust server to correct if wrong
- Pros: feels real-time
- Cons: must handle "server says no" gracefully

### 7. **Defensive interceptor at the edge**
*(api.ts isAuthFailure)*
- Centralize "session is dead" detection in one place, redirect everywhere
- Pros: every API call automatically protected
- Cons: needs careful regex to not over-match (we exclude /login itself)

### 8. **Route + service split**
*(backend)*
- HTTP routes are thin (validate, call service, return); services hold logic
- Pros: testable services without HTTP; routes easy to skim
- Cons: small overhead for one-shot endpoints

### 9. **Idempotent operations**
*(quest rolling, cosmetic unlocks, problem picking)*
- Calling twice is the same as calling once
- Pros: safe to retry; no double-grants
- Cons: requires unique constraints + `if exists: skip` checks

### 10. **Lazy state hydration**
*(auth store)*
- Read localStorage only after mount, not during SSR
- Pros: works with server components
- Cons: brief "loading" flicker for authed pages

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **ASGI** | Async Server Gateway Interface — async version of WSGI, the Python web server protocol |
| **App Router** | Next.js 13+ routing where files in `app/` are routes (vs old `pages/`) |
| **Auto-reconnect** | A client that re-establishes a dropped connection automatically (our `TypedWS` does it with exponential backoff) |
| **Background task** | An asyncio coroutine running in the same process as your HTTP server, doing non-request work |
| **Blueprint (Render)** | A `render.yaml` config that lets Render provision multiple services at once |
| **CORS** | Cross-Origin Resource Sharing — the browser-enforced rules about what cross-origin requests are allowed |
| **Discriminated union** | A TypeScript union of object types where each variant has a unique value in a "discriminator" field |
| **ELO** | A rating system that produces an expected win probability between two players |
| **Hub (pub/sub)** | A central registry of subscribers; producers publish to a channel, all subscribers get the message |
| **Internal URL** | A Render-internal connection URL for a Postgres DB, reachable only from inside Render's network |
| **JWT** | JSON Web Token — a signed token containing claims, used for stateless auth |
| **K-factor** | The multiplier on ELO changes per game — higher K = bigger swings |
| **Long-lived process** | A server process that stays alive between requests, vs serverless that dies after each |
| **Naive datetime** | Python datetime with no timezone info attached |
| **OG image** | Open Graph image — the preview thumbnail shown when a URL is shared to Twitter/Slack/etc. |
| **ORM** | Object-Relational Mapper — translates Python classes ↔ SQL tables |
| **Pre-render** | Generate the HTML of a page at build time (vs at request time) |
| **Pub/sub** | Publish-subscribe — a messaging pattern where publishers don't know who subscribes |
| **Pull-based** | A consumer requests work when ready, vs push-based where work is shoved at them |
| **Route group** | Next.js folder in parens like `(app)` that organizes routes without affecting URLs |
| **Server component** | A React component that runs only on the server, returns HTML, can't use hooks/state |
| **Stale-while-revalidate** | UI pattern: show old data immediately, fetch new in background, swap when ready |
| **Suspense** | React component that lets you declaratively show a fallback UI while children load |
| **Tier-K** | Our K-factor that varies by player tier (40 for bronze, 16 for legend) |
| **Tick** | A periodic loop iteration (our matchmaker ticks every 1s) |
| **Webhook** | An HTTP endpoint your service exposes that an external system POSTs to on events |
| **WebSocket** | Bidirectional persistent TCP connection over HTTP/HTTPS, for realtime messaging |
| **Zustand selector** | A function that picks a slice of store state — only re-renders when that slice changes |

---

## 16. Final exam

Try these without looking at the document. Self-graded.

### Section A — Architecture (10 questions)

1. Why is the backend on Render and the frontend on Vercel — why not put both on one?
2. The Codeforces verdict polling runs every 3 seconds. What sets the floor on user-perceived latency from "submit on CF" to "verdict appears in HUD"?
3. Trace the full sequence of events from "user clicks Enter Arena" → "they see the duel HUD". Name at least 8 steps.
4. The matchmaker is single-coroutine. What concurrency hazards does that eliminate? What hazards does it not eliminate?
5. The CF poller and the matchmaker share a database session pattern (`next(get_db())`). Why?
6. If Render's free Postgres expires after 90 days, what data do you lose and how do you recover?
7. You want to add a "spectator chat" feature. List the new tables, endpoints, WS events, and frontend components you'd need.
8. Why does the frontend route guard for `(app)` pages have to be a client component? What would happen if you tried it as a server component?
9. The CF problem picker excludes problems "either user has already AC'd". Where does that data come from?
10. Describe how a friend-duel goes from `/play/friend` to `/duel/{id}` for the HOST (not the joiner). What channel and event are involved?

### Section B — Data (10 questions)

11. What does `duel_steps.host_status` track and what are the possible values?
12. The `elo_history` table stores `elo_before`, `elo_after`, AND `delta`. Isn't `delta = after - before`? Why store all three?
13. Why is `username` indexed on the `users` table?
14. The `streaks` table has `last_duel_local_date` (a string), not a `Date` column. Why a string?
15. What does `cascade="all, delete-orphan"` do, and what would happen during DELETE FROM duels WHERE ... without it?
16. The `quest_progress` table has a UNIQUE constraint on `(user_id, quest_id, rolled_for_date)`. Why?
17. Why do we use `String(36)` for UUIDs rather than a dedicated `UUID` column type?
18. If you needed to compute "all users who have completed a quest of type 'win_no_wa' at least 5 times", write the SQL/SQLAlchemy query in pseudocode.
19. Postgres lets you store JSON in a `jsonb` column. We use `Text` (`problem_tags_json`, `payload_json`). What's the tradeoff?
20. The `replay_events.ts_offset_ms` is "milliseconds since duel start" — not an absolute timestamp. Why?

### Section C — Code-level (10 questions)

21. Why does `_get_current_user` return `User` and not `User | None`?
22. The frontend's `useDuel(s => s.user)` syntax — what's the `s => s.user` doing?
23. The CF poller iterates `reversed(submissions)`. Why?
24. The matchmaker calls `db.delete(host); db.delete(opp); db.commit()` in one transaction. Why combine?
25. What's the difference between `await asyncio.sleep(3)` and `time.sleep(3)` in async code? What goes wrong if you confuse them?
26. The `DuelHeader` component takes `duelStatus`. Why does it need that?
27. `useSearchParams()` requires a `<Suspense>` wrapper in App Router. Why?
28. The login form does `localStorage.setItem("ca_token", token)` BEFORE calling `setSession(token, me.data)`. Why that order?
29. The CF poller maintains `_last_seen_submission: dict[str, int]`. Why is it keyed by `"{handle}:{duel_id}"` and not just `handle`?
30. The frontend's `axios.interceptors.response` has a `sessionStorage` one-shot flag — what bug does that prevent?

### Section D — Engineering judgment (5 open-ended)

31. **Reliability**: List three concrete failure modes that could take the whole app down, and what you'd do to recover from each.
32. **Scale**: At 10,000 daily active users, what's the first thing that breaks in this architecture? At 100,000?
33. **Cost**: List every recurring cost (free or paid) of running this app. What would each tier of growth (1k, 10k, 100k DAU) cost roughly?
34. **Security**: Identify three security gaps in the current implementation and how you'd close them.
35. **UX research**: Pick one feature you didn't build and design how it would work end-to-end (data model, endpoints, UI). Examples: in-duel chat, voice notes, tournaments, friend system, problem suggestions, custom rating curves.

---

## How to convert this document to a PDF

Pick whichever is easiest:

### Option 1 — Pandoc (best output, requires install)
```bash
brew install pandoc basictex
cd /Users/saksham/Desktop/codeforces-duel/CodeArena-2026
pandoc docs/ARCHITECTURE.md \
  -o docs/ARCHITECTURE.pdf \
  --pdf-engine=xelatex \
  --variable geometry:margin=1in \
  --variable mainfont="Helvetica" \
  --variable monofont="Menlo" \
  --toc
```

### Option 2 — Browser print-to-PDF (zero install)
```bash
# Install one Node tool to render markdown to HTML
npm install -g markdown-pdf
markdown-pdf docs/ARCHITECTURE.md
# Produces docs/ARCHITECTURE.pdf
```

### Option 3 — VS Code extension (one click)
Install **Markdown PDF** by yzane in VS Code → open `ARCHITECTURE.md` → Cmd+Shift+P → "Markdown PDF: Export (pdf)".

### Option 4 — Online (no install at all)
- Open `docs/ARCHITECTURE.md` on GitHub
- Use **dillinger.io** or **stackedit.io** — paste the markdown, export as PDF
