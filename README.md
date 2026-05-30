# CodeArena — Real-time Codeforces Duels

> Two players. Five problems. Rising rating each step. First to clear the ladder wins.

**🌐 Live:**
- **Frontend:** https://code-arena-2026.vercel.app
- **Backend API:** https://codearena-backend-f05o.onrender.com
- **API Docs:** https://codearena-backend-f05o.onrender.com/docs

---

## What it is

CodeArena is a competitive-programming duel platform with the **arcade pacing of Clash Royale** wrapped around real Codeforces problems. Two players link their CF handles, get matched on ELO, race up a 5-problem ladder, and submit on Codeforces — our backend polls the CF verdict tape and updates the duel HUD in real time. No custom judge needed; CF is the source of truth.

Designed in three phases:

| Phase | What it ships |
|---|---|
| **1 — Core loop** | Auth · CF handle linking · Quick Match matchmaking · Live duel HUD · CF verdict poller · Win/lose ceremony · ELO updates · Leaderboard |
| **2 — Status & retention** | 7-tier × 3-division ranks · Streak system with shields · Daily + weekly quests · Promotion ceremony · Post-duel replay · OG share image · Public profiles |
| **3 — Personality & breadth** | In-duel emotes · Friend duel (private rooms) · Open lobby · Algorithm decks · Cosmetics · Async challenge · Spectate mode · Anti-abuse |

All three phases are deployed and live at the URLs above.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next 16 (App Router) · TypeScript · Tailwind v4 · Zustand · TanStack Query · framer-motion · native WebSocket |
| Backend | FastAPI · SQLAlchemy · Postgres (Render-hosted) · asyncio background workers · `httpx` for CF API |
| Realtime | Native WebSockets (`/ws/duel/{id}`, `/ws/queue/{user_id}`, `/ws/user/{user_id}`) |
| Deployment | Backend on **Render** (with Postgres), Frontend on **Vercel** — both auto-deploy from this repo |

---

## Routes

**Pages (App Router):**
| | |
|---|---|
| `/` | Landing |
| `/login`, `/register` | Auth |
| `/play` | Dashboard (Quick Match + 4 modes + recent duels + quests) |
| `/play/queue` | Matchmaking searching overlay |
| `/play/friend` | Private friend duel (host or join by 6-char code) |
| `/play/lobby` | Open lobby browser + spectate |
| `/play/async` | Async challenge inbox + send |
| `/duel/[id]` | Live duel HUD |
| `/duel/[id]/spectate` | Read-only spectator HUD |
| `/duel/[id]/replay` | Post-duel timeline + share card |
| `/profile`, `/profile/settings` | Own profile + settings (CF handle, deck, cosmetics) |
| `/quests` | Full quests view |
| `/u/[handle]` | Public profile (sharable, unauthed) |
| `/leaderboard` | Global ranks |

**Selected API endpoints** (full surface at `/docs`):
- `POST /auth/{register,login}` · `GET /auth/me` · `PUT /auth/cf-handle`
- `POST /matchmaking/enqueue` · `DELETE /matchmaking/queue/{id}`
- `POST /friend-duel` · `POST /friend-duel/join` · `GET /friend-duel/by-code/{code}`
- `GET /duel/{id}/state` · `GET /replay/{id}` (public) · `GET /lobby/{active-duels,open-rooms}` (public)
- `GET /quests/today` · `POST /quests/{id}/claim`
- `GET /deck/me` · `PUT /deck/me`
- `GET /cosmetics/me` · `PUT /cosmetics/equip`
- `POST /async-challenge` · `GET /async-challenge/inbox` · `POST /{id}/{accept,submit}`
- `GET /leaderboard` · `GET /profile/me/elo-history` · `GET /profile/by-handle/{username}` (public)
- WebSocket: `/ws/duel/{id}` (verdict + emote), `/ws/queue/{user_id}` (match found), `/ws/user/{user_id}` (friend-duel-started)

---

## Run it locally

```bash
# Backend (terminal 1)
cd backend
pip install -r requirements.txt
rm -f codearena.db   # if columns changed since your last boot
python -m uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd frontend
cp .env.example .env.local   # first time only
npm install
npm run dev
# open http://localhost:3000
```

**Environment variables** for local frontend (`frontend/.env.local`):
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

To point local frontend at the live deployed backend instead, use the production URLs (with `wss://` for the WS one).

---

## Tests

```bash
cd backend  && python -m pytest                  # 20 tests (elo, problem picker, streak)
cd frontend && npm test                          # 22 tests (elo, tier)
cd frontend && npx tsc --noEmit && npm run build # type-check + build
```

---

## Deployment

Pushes to `feat/db-layer` (or `main`) auto-deploy both services:

- **Backend** rebuilds on Render → ~3 min build (compiles `psycopg2-binary`) → live at the URL above
- **Frontend** rebuilds on Vercel → ~2 min build → live at the URL above

CORS regex on the backend (`https://.*\.vercel\.app$`) means any Vercel preview subdomain works without extra setup.

Full setup instructions in [DEPLOYMENT.md](DEPLOYMENT.md). Current state and known caveats in [PROGRESS.md](PROGRESS.md).

---

## Design docs

Living docs that drove the build:

- [docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md](docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md) — full design spec (visual system, mechanics, gamification rules, data model, backend extensions)
- [docs/superpowers/plans/2026-05-22-codeforces-duel-phase-1.md](docs/superpowers/plans/2026-05-22-codeforces-duel-phase-1.md) — Phase 1 implementation plan
- [docs/superpowers/plans/2026-05-22-codeforces-duel-phase-2.md](docs/superpowers/plans/2026-05-22-codeforces-duel-phase-2.md) — Phase 2 implementation plan

---

## License

MIT.
