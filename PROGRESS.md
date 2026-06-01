# CodeArena 2026 — Build Progress

**Last updated:** 2026-05-22
**Repo root:** `/Users/saksham/Desktop/codeforces-duel/CodeArena-2026`
**Branch:** `feat/db-layer`

---

## TL;DR

- ✅ **Spec** complete
- ✅ **Phase 1** — Core ranked duel loop (25 tasks)
- ✅ **Phase 2** — Status + retention (T1–T11)
- ✅ **Phase 3** — Personality + breadth (T1–T8): emotes, friend duel, open lobby, decks UI, async challenge, cosmetics, spectate, anti-abuse
- ✅ **Deployment configs** — `render.yaml` (backend + Postgres), `vercel.json` (frontend), `DEPLOYMENT.md` step-by-step

## Deployment quickstart

**Currently deployed at:** `https://code-arena-wine.vercel.app` is stuck on
pre-Phase-3 code AND its frontend bundle was built with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`,
so registration tries to POST to the visitor's own machine. To fix:

1. Deploy backend on Render — see [DEPLOYMENT.md](DEPLOYMENT.md). The
   `render.yaml` blueprint sets up the web service + Postgres in one click.
2. Add Vercel env vars: `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_BASE_URL`
   pointing to the Render URL.
3. Redeploy Vercel.

After that, the live site has the full Phase 1+2+3 surface.

## Verification snapshot (last green build)

- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **18 routes** compile clean
- `npm test` — **22 Vitest tests passing**
- `pytest` — **20 backend tests passing**
- Backend boots cleanly; **52 routes registered**; auth-guarded endpoints return 401, public endpoints 200

---

## End-to-end feature surface

### Phase 1 — core duel loop
- Auth (register, login, JWT, CF handle linking with live validation)
- Persistent rail + topbar with TierBadge user pill
- `/play` dashboard: hero, profile micro card, 4 mode tiles, recent duels, quests
- Quick Match (ELO-windowed pairing) → arena entrance → live duel HUD
- Live HUD: CRT scanlines, ladder rail, opponent panels, problem card with CF deep link, real-time WS verdict updates from the CF API poller
- Win/lose ceremony with ELO number-ticker

### Phase 2 — status + retention
- TierBadge integrated across pill, micro card, profile, leaderboard, replay
- Timezone-aware streak system with shield logic (visible flame badge on dashboard)
- Daily (3) + weekly (1) quests with 6 rule types, claim flow, XP rewards
- Promotion ceremony (full-screen overlay) + demotion toast
- Post-duel replay (`/duel/[id]/replay`) with ResultCard + ReplayTimeline
- OG share image (1200×630, edge runtime) at `/duel/[id]/replay/opengraph-image`
- Profile with EloSparkline + RecentDuelsList linking to replays
- Public profile at `/u/[handle]` (unauthed, sharable)

### Phase 3 — personality + breadth
- **Emotes** in-duel: EmoteTray (6 glyphs, 4/min/user rate limit) + FloatingEmotes animation layer
- **Friend duel** at `/play/friend`: create private room (3 rating presets: chill/medium/hard), 6-char shareable code, 15-min expiry; opponent enters code to join; host gets WS push and auto-redirect
- **Open lobby** at `/play/lobby`: live list of open friend rooms + active duels, refreshes every 5s
- **Algorithm decks** UI in settings: pick up to 3 CF tags; matchmaker honors them when problem-picking
- **Cosmetics**: 6 banners + 6 avatar glyphs, auto-unlocked by tier (Silver, Gold, Platinum, Diamond, Master), equipped from settings
- **Async challenge** at `/play/async`: send to friend by username, see 5-problem seed, self-report results, winner resolved by steps then duration
- **Spectate mode** at `/duel/[id]/spectate`: read-only HUD, sees floating emotes
- **Anti-abuse**: smurf check (cap ELO gain to +5 when CF rating >>internal ELO and opp 300+ weaker); matchmaking enqueue rate limit (3 per 120s, returns 429)

---

## Routes (18 frontend pages · 52 backend endpoints)

**Frontend pages:**
- Marketing: `/`, `/leaderboard`, `/u/[handle]`
- Auth: `/login`, `/register`
- App: `/play`, `/play/queue`, `/play/friend`, `/play/lobby`, `/play/async`, `/profile`, `/profile/settings`, `/quests`
- Duel: `/duel/[id]`, `/duel/[id]/spectate`, `/duel/[id]/replay`, `/duel/[id]/replay/opengraph-image`

**Backend routers:**
- `/auth/*` — register, login, me (incl. streak), cf-handle, sync-cf
- `/duel/*` — legacy create/join/start, `/{id}/state`, `/recent/me`
- `/matchmaking/enqueue` (rate-limited), `/matchmaking/queue/{id}` DELETE
- `/cf/handle/{h}/validate`, `/cf/problems`
- `/leaderboard`, `/quests/today`, `/quests/{id}/claim`
- `/replay/{id}` (public)
- `/profile/me/elo-history`, `/profile/by-handle/{username}` (public)
- `/friend-duel` POST/DELETE, `/by-code/{code}`, `/join`
- `/lobby/active-duels`, `/lobby/open-rooms` (public)
- `/deck/me` GET/PUT
- `/cosmetics/me`, `/cosmetics/equip`
- `/async-challenge` POST, `/inbox`, `/{id}/accept`, `/{id}/submit`

**WebSocket channels:**
- `/ws/duel/{duel_id}` — bidirectional: receives `emote` (rate-limited), broadcasts `state`, `verdict`, `step_advance`, `duel_complete`, `emote`
- `/ws/queue/{user_id}` — server pushes `queue_tick`, `match_found`
- `/ws/user/{user_id}` — server pushes `friend_duel_started`

---

## Project structure

```
CodeArena-2026/
├── backend/app/
│   ├── api/routes/
│   │   ├── auth.py, duel.py, practice.py
│   │   ├── matchmaking.py, cf.py, leaderboard.py
│   │   ├── quests.py, replay.py
│   │   ├── friend_duel.py, open_lobby.py, deck.py        ← Phase 3
│   │   └── async_challenge.py, cosmetics.py              ← Phase 3
│   ├── services/
│   │   ├── codeforces.py, elo.py, problem_picker.py
│   │   ├── ws_hub.py, matchmaker.py, cf_poller.py
│   │   ├── duel_completion.py (with smurf check)
│   │   ├── streak.py, quests.py
│   │   └── emote.py                                       ← Phase 3
│   ├── main.py, models.py, schemas.py, db.py
│   └── tests/services/                                    ← elo, problem_picker, streak
├── frontend/
│   ├── app/
│   │   ├── (marketing)/      ← /, /leaderboard, /u/[handle]
│   │   ├── (app)/
│   │   │   ├── play/         ← page + queue/, friend/, lobby/, async/ (Phase 3)
│   │   │   ├── duel/[id]/    ← page + replay/ + spectate/ (Phase 3)
│   │   │   ├── profile/, profile/settings/, quests/
│   │   └── login/, register/
│   ├── components/
│   │   ├── primitives/       ← Button, Card, NeonText, etc.
│   │   ├── layout/           ← AppShell, Rail, Topbar, UserPill
│   │   ├── arena/            ← + EmoteTray, FloatingEmotes (Phase 3)
│   │   ├── cosmetic/         ← TierBadge
│   │   ├── dashboard/        ← Hero, ProfileMicroCard, ModesGrid, etc.
│   │   ├── profile/          ← + DeckEditor, CosmeticsEditor (Phase 3)
│   │   └── replay/           ← ReplayTimeline, ResultCard
│   ├── lib/                  ← api, ws, cn, fonts, elo, tier, streak
│   ├── stores/               ← auth, queue, duel (with floatingEmotes, sendEmote)
│   ├── types/                ← user, duel, ws (EmoteGlyph), cf, quest, replay
│   ├── tests/lib/
│   └── _legacy/              ← old Pages-Router code preserved
└── docs/superpowers/
    ├── specs/2026-05-22-codeforces-duel-arcade-design.md
    └── plans/
        ├── 2026-05-22-codeforces-duel-phase-1.md
        └── 2026-05-22-codeforces-duel-phase-2.md
```

---

## Known follow-ups (non-blocking)

1. **Quest evaluator unit tests** not written. Evaluators work but uncovered.
2. **No Alembic migration.** Relies on `Base.metadata.create_all()` at startup. **Delete `backend/codearena.db`** before first boot if columns changed.
3. **Async challenge results are self-reported.** Future: run the CF poller against the recipient's handle during their 90-min window to auto-fill `steps_cleared`.
4. **Friend rooms expire after 15 min** in the waiting state silently — host gets no notification.
5. **No avatar glyph rendering yet on the user pill** — the `EquippedCosmetic.glyph_key` is saved but the pill always shows the first letter of the username. Easy follow-up: thread the equipped glyph through `/auth/me` and render in `UserPill`.

---

## Caveats for next session

1. **Python 3.9** — pre-existing on this machine. New backend files use `Optional[X]` / `List[X]` explicitly rather than `X | None` / `list[X]` to avoid runtime errors at Pydantic class init.
2. **SQLite + new columns** — `create_all` doesn't ALTER existing tables. Delete `codearena.db` if columns changed.
3. **Existing `duel_router` owns `GET /duel/{id}`** — new endpoint serving frontend state is `/duel/{id}/state`. Frontend already calls that.
4. **CF poller hits real Codeforces.** Backs off on errors.

---

## How to run

```bash
cd backend && rm -f codearena.db && python3 -m uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
# http://localhost:3000
```

## Tests + build

```bash
cd backend  && python3 -m pytest -v
cd frontend && npm test && npx tsc --noEmit && npm run build
```

---

## Full smoke test recipe

1. `rm -f backend/codearena.db` for a fresh DB
2. Start backend + frontend in two terminals
3. Register two accounts (use two browser profiles); link real CF handles
4. **Quick Match** — both click "Enter arena" → match → duel → submit on CF → verdicts appear → victory ceremony
5. **Emotes** — click "✦ EMOTE" during duel, pick one, opponent sees it float
6. **Friend duel** — `/play/friend` → create medium room → copy code; other account joins by code → both in duel
7. **Open lobby** — create a second friend room; other account opens `/play/lobby` → sees room + any live duels
8. **Spectate** — click "Spectate" on a live duel from `/play/lobby` → read-only HUD
9. **Decks** — `/profile/settings` → pick 3 tags → Save; next Quick Match problems prefer those tags
10. **Cosmetics** — `/profile/settings` → banner/glyph swatches; click owned ones to equip
11. **Async** — `/play/async` → send to other username → other accepts → both submit results → winner resolves
12. **Replay** — finish a duel → "View replay" → timeline + share link
13. **Public profile** — click any leaderboard row → `/u/<username>`
14. **Promotion ceremony** — manually set ELO to 999 in DB; win a duel → ceremony plays before victory overlay
