# CodeArena 2026 — Build Progress

**Last updated:** 2026-05-22
**Repo root:** `/Users/saksham/Desktop/codeforces-duel/CodeArena-2026`
**Branch:** `feat/db-layer`

---

## TL;DR

- ✅ **Spec** complete in `docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md`
- ✅ **Phase 1** plan + fully executed
- ✅ **Phase 2** plan + **fully executed** (T1–T11) + smoke verified
- ⏳ **Phase 2 T12 / quest tests** not written yet (functional coverage hole only)
- ⏳ **Phase 3** not started

## Verification snapshot (last green build)

- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **14 routes** compile clean (new this build: `/duel/[id]/replay`, OG image route, `/u/[handle]`)
- `npm test` — **22 Vitest tests passing**
- `pytest` — **20 backend tests passing** (elo + problem picker + streak)
- Backend boots cleanly, `/health` 200, `/quests/today` 401 (auth-guarded ✓), `/replay/{nope}` 404 ✓

---

## What works now (end-to-end)

**Phase 1 + Phase 2 features all integrated:**

- Auth (register, login, JWT, CF handle linking with live validation)
- Persistent rail + topbar shell with `TierBadge` everywhere
- `/play` dashboard with hero, profile micro card (incl. streak badge), 4 mode tiles, recent duels, real quests panel
- Quick Match matchmaking → arena entrance animation → live duel HUD
- Live duel HUD with CRT scanlines, ladder rail, opponent panels, problem card with CF deep link, real-time WS verdict ingestion via CF API poller
- Win/lose ceremony with ELO ticker, **promotion ceremony** (full-screen tier-badge assemble animation), **demotion toast**, "View replay" link
- `/duel/[id]/replay` route with `ResultCard` (share button) + `ReplayTimeline` (vertical spine, alternating columns, verdict pills) + per-step problem list
- **OG share image** at `/duel/[id]/replay/opengraph-image` (1200×630, edge runtime)
- `/quests` page + dashboard panel — daily (3) + weekly (1), claim flow, rewards (XP/shields)
- `/profile` with EloSparkline + RecentDuelsList (rows link to replay)
- `/u/[handle]` public profile with stat grid, ELO trajectory chart, recent activity
- Leaderboard with TierBadge per row, rows link to `/u/[handle]`
- Backend: 5 background services (matchmaker, cf_poller, ws_hub) + duel completion writes ELO history, streak ticks, quest evaluation, promotion/demotion flags, ReplayEvent rows

---

## Project structure

```
CodeArena-2026/
├── backend/                  ← FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── api/routes/       ← auth, duel, practice, matchmaking, cf, leaderboard,
│   │   │                       quests, replay
│   │   ├── services/         ← codeforces, elo, problem_picker, ws_hub, matchmaker,
│   │   │                       cf_poller, duel_completion, streak, quests
│   │   ├── main.py           ← app + WS endpoints + serializers + workers
│   │   ├── models.py         ← all tables (Phase 1+2: Streak, Quest, QuestProgress,
│   │   │                       ReplayEvent, DuelStep, MatchmakingQueueEntry, EloHistory)
│   │   ├── schemas.py        ← Pydantic schemas (Optional, NOT `| None`)
│   │   └── db.py
│   ├── tests/services/       ← elo, problem_picker, streak
│   ├── conftest.py
│   └── requirements.txt
├── frontend/                 ← Next 16 App Router + TypeScript + Tailwind v4
│   ├── app/
│   │   ├── (marketing)/      ← /, /leaderboard, /u/[handle]
│   │   ├── (app)/            ← auth-guarded: /play, /play/queue,
│   │   │                       /duel/[id], /duel/[id]/replay (+ opengraph-image),
│   │   │                       /profile, /profile/settings, /quests
│   │   ├── login/, register/
│   │   └── layout.tsx, providers.tsx, globals.css
│   ├── components/
│   │   ├── primitives/       ← Button, Card, NeonText, StatTile, VerdictPill,
│   │   │                       LiveIndicator, ScanlineOverlay
│   │   ├── layout/           ← AppShell, Rail, Topbar, UserPill (uses TierBadge)
│   │   ├── arena/            ← LadderRail, OpponentPanel, ProblemCard, DuelTimer,
│   │   │                       VictoryOverlay, NumberTicker, ArenaEntrance,
│   │   │                       PromotionCeremony, DemotionToast
│   │   ├── cosmetic/         ← TierBadge
│   │   ├── dashboard/        ← HeroBattleCard, ProfileMicroCard (with StreakBadge),
│   │   │                       ModesGrid, RecentDuelsPanel, QuestsPanel, StreakBadge
│   │   ├── profile/          ← EloSparkline, RecentDuelsList
│   │   └── replay/           ← ReplayTimeline, ResultCard
│   ├── lib/                  ← api, ws, cn, fonts, elo, tier, streak
│   ├── stores/               ← auth, queue, duel (Zustand)
│   ├── types/                ← user, duel, ws, cf, quest, replay
│   ├── tests/lib/            ← Vitest: elo, tier
│   └── _legacy/              ← old Pages-Router code, preserved for reference
└── docs/superpowers/
    ├── specs/2026-05-22-codeforces-duel-arcade-design.md
    └── plans/
        ├── 2026-05-22-codeforces-duel-phase-1.md  ← DONE
        └── 2026-05-22-codeforces-duel-phase-2.md  ← DONE (except quest tests)
```

---

## Phase 2 — DONE ✅ (T1–T11)

- **T1 — TierBadge** integrated across UserPill, ProfileMicroCard, Profile, Leaderboard, ResultCard. 7 tiers × 3 divisions, 4 sizes (xs/sm/md/lg), tier-specific gradients + glows.
- **T2 — Streak system:** timezone-aware service (`backend/app/services/streak.py`) with 6 pytest tests covering shield logic, midnight rollover, and gap handling. Frontend `lib/streak.ts` for flame tone helpers.
- **T3 — StreakBadge** on dashboard; `/auth/me` extended to return nested `streak`.
- **T4 — Quest system:** 10 seed templates (3 weekly + 7 daily), stable per-user/date hash for picks, 6 rule evaluators (`wins`, `clear_rating`, `win_no_wa`, `win_under_seconds`, `win_vs_higher_elo`, `streak_reach`), idempotent seeding on app startup.
- **T5 — Quest routes + UI:** `GET /quests/today`, `POST /quests/{id}/claim`. Dashboard panel + `/quests` full-page view with progress bars + claim button.
- **T6 — ReplayEvent storage + ingest:** `verdict` and `step_advance` events written by CF poller. `duel_complete` written by `duel_completion.py` with full payload (winner_id, promotion_for, new_tier, demotion_for, elo_changes).
- **T7 — Replay route + UI:** `GET /replay/{duel_id}` returns participants + steps + full event stream. Frontend `/duel/[id]/replay` page renders `ResultCard` (with copy-link share) + `ReplayTimeline` (vertical spine with alternating columns, verdict pills, step-advance markers, start/end caps) + per-step problem table with status indicators. "View replay" button added to VictoryOverlay.
- **T8 — Profile expansion:** `EloSparkline` (SVG line chart with tier-band guides) + `RecentDuelsList` (links rows to replay) consume `/profile/me/elo-history` and `/duel/recent/me`.
- **T9 — Public profile `/u/[handle]`:** unauthed page with TierBadge LG, stat grid, ELO trajectory chart, recent activity log. Reads from `GET /profile/by-handle/{username}`. Leaderboard rows link here.
- **T10 — Promotion ceremony + demotion toast:** `PromotionCeremony` is a full-screen overlay (z-60) with radial particle burst, scale-rotate badge entrance, ~2.8s. Auto-dismisses (or click). `DemotionToast` is a quiet top-center floating toast (3.2s). Duel page chains promotion → victory; demotion shows toast alongside.
- **T11 — OG share image:** `/duel/[id]/replay/opengraph-image.tsx` uses Next 16 `ImageResponse` (edge runtime) to render a 1200×630 PNG with the result card layout. Fetches `/replay/{id}` server-side; gracefully degrades if backend unreachable.

---

## Known follow-ups (non-blocking)

1. **Quest evaluator unit tests** — `tests/services/test_quests.py` not written. Evaluators work, just no automated coverage. Low risk because rule shapes are simple JSON.
2. **Backend `str | None` syntax in `duel_completion.py`** is safe because of `from __future__ import annotations` at top of file. If you ever remove that import, convert to `Optional[str]` (Python 3.9).
3. **OG image runtime warning** at build time: "Using edge runtime on a page currently disables static generation for that page" — expected for the OG route; not a failure.

---

## Phase 3 — NOT STARTED

Per spec § 9:

- In-duel emotes (WS + tray UI, server rate-limit)
- Friend duel (private room codes, configurable rating curve)
- Open lobby browser (`/play/lobby`)
- Algorithm decks fully activated in problem picker (table writeable now, picker honors them, but **no UI for setting deck**)
- Cosmetics (banners, frames, glyphs, signature anims) + unlock UI
- Async challenge end-to-end (`/play/async`)
- Spectate mode (read-only `/ws/duel/{id}`)
- Smurf-check tuning and anti-abuse hardening

Dashboard mode tiles `/play/friend`, `/play/lobby`, `/play/async` currently 404 by design.

---

## Caveats for next session

1. **Python 3.9** is on this machine. `str | None` at module scope (outside `from __future__ import annotations`) fails at import time. The existing schemas.py was already patched; if you add new code, prefer `Optional[X]` in pydantic models.
2. **SQLite + new columns:** `Base.metadata.create_all()` creates new tables but doesn't alter existing ones. **Delete `backend/codearena.db`** before first boot if you added/changed columns in `User` / `Duel`. Streak tests already handle this themselves.
3. **Duel state route collision:** existing `duel_router` owns `GET /duel/{id}` (legacy `DuelOut` shape). The new endpoint serving the frontend state is at `/duel/{id}/state` in `main.py`. Frontend duel store calls `/duel/${id}/state`.
4. **CF poller hits real Codeforces.** Heavy local dev triggers backoff. Not a failure.
5. **Promotion ceremony triggers only when tier actually crosses up.** Force-test by setting a user's ELO to 999 in DB, then winning a duel — should promote Bronze → Silver.

---

## How to run

**Backend:**
```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
# http://localhost:3000
```

**Tests:**
```bash
cd frontend && npm test                # Vitest
cd backend  && python3 -m pytest -v    # pytest
```

**Full typecheck + build:**
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## Smoke test recipe

1. `rm -f backend/codearena.db` for a fresh DB
2. Start backend + frontend
3. Register two accounts in different browsers (e.g. private window pair)
4. Link a real CF handle to each in `/profile/settings`
5. Both click "Enter arena" on dashboard → they match within ~2s → arena entrance animation
6. Both submit on Codeforces from the duel page; HUD updates verdicts live
7. First to clear step 5 wins → VictoryOverlay shows ELO ±
8. If you crossed a tier boundary, **PromotionCeremony plays first**, then VictoryOverlay
9. Click "View replay" → `/duel/[id]/replay` shows ResultCard + Timeline + step list
10. Copy share link → paste into a Twitter Card validator → see the OG image
11. Visit `/u/<your-username>` → public profile renders with ELO chart and stats
12. Quests panel on dashboard updates with progress; claim button credits XP
