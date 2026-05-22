# CodeArena 2026 — Build Progress

**Last updated:** 2026-05-22
**Repo root:** `/Users/saksham/Desktop/codeforces-duel/CodeArena-2026`
**Branch:** `feat/db-layer`

---

## TL;DR

- ✅ **Spec** complete in `docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md`
- ✅ **Phase 1 plan** complete + fully executed in `docs/superpowers/plans/2026-05-22-codeforces-duel-phase-1.md`
- ✅ **Phase 2 plan** complete, **~50% executed** in `docs/superpowers/plans/2026-05-22-codeforces-duel-phase-2.md`
- ⏳ **Phase 2 remaining:** Profile sparkline + duels list, public profile page, promotion ceremony overlay, OG image, final smoke test
- ⏳ **Phase 3** not started

## Verification snapshot (last green build)

- `npm run build` (frontend) — **passed**, 10 routes compile clean
- `npx tsc --noEmit` — **0 errors**
- `npm test` — **22 tests passing** (Vitest)
- `pytest` — **20 tests passing** (9 elo + 5 problem picker + 6 streak)
- Backend boots cleanly; `/health` and `/leaderboard` return 200

---

## Project structure

```
CodeArena-2026/
├── backend/                  ← FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── api/routes/       ← auth, duel, practice, matchmaking, cf, leaderboard, quests
│   │   ├── services/         ← codeforces, elo, problem_picker, ws_hub, matchmaker,
│   │   │                       cf_poller, duel_completion, streak, quests
│   │   ├── main.py           ← app + WS endpoints + serializers + workers
│   │   ├── models.py         ← all tables (incl. Phase 2: Streak, Quest, QuestProgress, ReplayEvent)
│   │   ├── schemas.py        ← Pydantic schemas (Optional, not `| None` — Python 3.9 compat)
│   │   └── db.py
│   ├── tests/services/       ← pytest: elo, problem_picker, streak
│   ├── conftest.py
│   └── requirements.txt
├── frontend/                 ← Next 16 App Router + TypeScript + Tailwind v4
│   ├── app/
│   │   ├── (marketing)/      ← /, /leaderboard, /u/[handle]  (← /u/[handle] NOT BUILT YET)
│   │   ├── (app)/            ← auth-guarded: /play, /play/queue, /duel/[id], /profile,
│   │   │                       /profile/settings, /quests
│   │   ├── login/, register/
│   │   └── layout.tsx, providers.tsx, globals.css
│   ├── components/
│   │   ├── primitives/       ← Button, Card, NeonText, StatTile, VerdictPill, LiveIndicator, ScanlineOverlay
│   │   ├── layout/           ← AppShell, Rail, Topbar, UserPill
│   │   ├── arena/            ← LadderRail, OpponentPanel, ProblemCard, DuelTimer, VictoryOverlay, NumberTicker, ArenaEntrance
│   │   ├── cosmetic/         ← TierBadge
│   │   ├── dashboard/        ← HeroBattleCard, ProfileMicroCard, ModesGrid, RecentDuelsPanel, QuestsPanel, StreakBadge
│   │   └── profile/          ← EloSparkline, RecentDuelsList  (← BOTH NOT BUILT YET — profile page imports them)
│   ├── lib/                  ← api, ws, cn, fonts, elo, tier, streak
│   ├── stores/               ← auth, queue, duel  (Zustand)
│   ├── types/                ← user, duel, ws, cf, quest
│   ├── tests/lib/            ← Vitest: elo, tier
│   └── _legacy/              ← old Pages-Router code, preserved for reference
└── docs/superpowers/
    ├── specs/2026-05-22-codeforces-duel-arcade-design.md
    └── plans/
        ├── 2026-05-22-codeforces-duel-phase-1.md
        └── 2026-05-22-codeforces-duel-phase-2.md
```

---

## Phase 1 — DONE ✅ (all 25 tasks)

End-to-end ranked duel loop:

- App Router + TypeScript migration of placeholder frontend (legacy code backed up to `frontend/_legacy/`)
- Arcade Neon visual system (palette, type, components, motion)
- Auth flow (login/register/JWT/CF handle linking with live validation)
- Persistent rail + topbar shell
- `/play` dashboard (hero, profile micro, 4 mode tiles, recent duels, quests panel)
- Quick Match matchmaking (`/matchmaking/enqueue`, ±150 ELO window expanding to ±500, WS `match_found`)
- `/play/queue` searching overlay → arena entrance animation → `/duel/[id]`
- Live duel HUD: ladder rail, opponent panels, problem card with CF deep link, timer with CRT scanlines
- Codeforces verdict poller (every 3s per active duel, per-handle rate limiting, backoff)
- WS events: `state`, `verdict`, `step_advance`, `duel_complete`, `opponent_disconnected`
- Win/lose ceremony with ELO number-ticker
- Basic leaderboard `/leaderboard`
- Profile `/profile` + settings `/profile/settings`
- Backend tables: `DuelStep`, `MatchmakingQueueEntry`, `EloHistory` + `User.elo`/`timezone` + `Duel.format`/`time_cap_seconds`
- Tests: 22 frontend Vitest + 14 backend pytest, all passing

---

## Phase 2 — IN PROGRESS (~50% done)

### ✅ Done

**T1 — Tier badges** — `components/cosmetic/TierBadge.tsx` with 7-tier gradient + 3-division support; integrated into `UserPill`, `ProfileMicroCard`, `LeaderboardPage`, `ProfilePage`.

**T2 — Streak math + service + tests**
- `backend/app/services/streak.py` (timezone-aware date math, shield logic)
- `backend/tests/services/test_streak.py` — 6 tests passing
- `Streak` table added to `models.py`
- `frontend/lib/streak.ts` (flame tone helpers)

**T3 — Streak UI + /auth/me expansion + wired into completion**
- `components/dashboard/StreakBadge.tsx` rendered inside `ProfileMicroCard`
- `/auth/me` now returns nested `streak: { current_count, longest_count, shields_remaining }`
- `User.streak` type added; `frontend/types/user.ts` updated
- `duel_completion.py` calls `tick_streak()` for both players after ELO update

**T4 — Quest models + service + rule evaluators**
- `Quest` + `QuestProgress` tables in `models.py`
- `backend/app/services/quests.py` — 10 seed templates, `roll_today_for()`, `evaluate_after_duel()`
- 6 rule types: `wins`, `clear_rating`, `win_no_wa`, `win_under_seconds`, `win_vs_higher_elo`, `streak_reach`
- Stable user/date-hashed quest selection (3 daily + 1 weekly)
- Seeded on app startup (idempotent by slug)
- Quest evaluation wired into `duel_completion.py` after streak tick
- ⚠️ Tests for quest evaluators **not written yet** (was a planned step)

**T5 — Quests routes + panel + page**
- `backend/app/api/routes/quests.py` — `GET /quests/today`, `POST /quests/{id}/claim`
- `components/dashboard/QuestsPanel.tsx` — full panel with progress bars + claim button
- `app/(app)/quests/page.tsx` — full-width quests view
- `QuestsPanelStub` replaced with `QuestsPanel` on dashboard
- Quest router mounted in `main.py`

**T6 (partial) — ReplayEvent ingest started**
- `ReplayEvent` table added to `models.py`
- `cf_poller.py` updated to write `verdict` and `step_advance` rows
- `duel_completion.py` updates `duel.status` etc. but does NOT yet write a `duel_complete` row to `ReplayEvent` — **TODO**

**Bonus — Tier promotion detection**
- `duel_completion.py` already computes `promotion_for` and `new_tier` and broadcasts them in `duel_complete` WS payload (used by the not-yet-built PromotionCeremony component)

**Bonus — Profile endpoints already added in `main.py`**
- `GET /profile/me/elo-history` — returns last 50 EloHistory rows, ascending
- `GET /profile/by-handle/{username}` — public profile data (used by /u/[handle] page when built)

### ⏳ Remaining

**T6 (finish) — ReplayEvent storage**
- Add `duel_complete` row write in `duel_completion.py` (after streak/quest blocks):
  ```python
  from app.models import ReplayEvent
  db.add(ReplayEvent(
      duel_id=duel.id,
      ts_offset_ms=int((datetime.utcnow() - duel.started_at).total_seconds() * 1000) if duel.started_at else 0,
      user_id=None,
      event_type="duel_complete",
      payload_json=json.dumps({
          "winner_id": winner_user_id,
          "elo_changes": {...},  # same as WS payload
          "promotion_for": promotion_for,
          "new_tier": new_tier,
      }),
  ))
  db.commit()
  ```

**T7 — Replay route + timeline UI + share card**
- Backend: create `backend/app/api/routes/replay.py` with `GET /replay/{duel_id}` (public, no auth) returning `{ duel: {...}, events: [...], steps: [...], participants: [...] }`. Mount in `main.py`.
- Frontend types: `frontend/types/replay.ts`
- Frontend components: `frontend/components/replay/ReplayTimeline.tsx` (vertical timeline, alternating cols per player, verdict pills with relative timestamps, step-advance markers), `frontend/components/replay/ResultCard.tsx` (shareable summary card with copy-link).
- Frontend page: `frontend/app/(app)/duel/[id]/replay/page.tsx`.
- Update `VictoryOverlay` to add a "View replay" link → `/duel/[id]/replay`.

**T8 — Profile expansion: EloSparkline + RecentDuelsList**
- ⚠️ **CRITICAL: ProfilePage already imports these — frontend won't compile until they exist.** Create:
  - `frontend/components/profile/EloSparkline.tsx` — SVG line chart, ~600×120, polyline of ELO points from `GET /profile/me/elo-history`, tier-band background guides (color stripes at 1000/1300/1600/1900/2200/2500), TanStack Query `["my-elo-history"]`.
  - `frontend/components/profile/RecentDuelsList.tsx` — list view (more rows + click-through to `/duel/[id]/replay`) reusing the `/duel/recent/me` endpoint.

**T9 — Public profile `/u/[handle]`**
- `frontend/app/(marketing)/u/[handle]/page.tsx`. Reads `GET /profile/by-handle/{handle}`. Hero with `TierBadge size="lg"`, stat grid, ELO sparkline, recent duels list. No auth required. Add `<Link href={`/u/${username}`}>` from leaderboard rows (already done) and from profile pages.

**T10 — Promotion ceremony overlay**
- `frontend/components/arena/PromotionCeremony.tsx` — full-screen overlay (z-60 above VictoryOverlay's z-50): old tier badge dissolves into particles, new badge assembles with a glow + scale-in, tier name in display type, ~2.5s, then resolves (callback to show VictoryOverlay next).
- In `frontend/app/(app)/duel/[id]/page.tsx`, the duel store's `complete` already exposes `winnerId` and `eloChanges`. **You'll need to add `promotion_for` and `new_tier` to the duel store too** (`stores/duel.ts` — extend the `complete` shape, the WS payload already carries these). Then in the duel page, conditionally render `<PromotionCeremony />` first, then `<VictoryOverlay />` once promotion finishes.
- Demotion: a small purple toast "tier dropped" — no ceremony. Easiest: a 3-second floating div top-right.

**T11 — OG share image for replay**
- `frontend/app/(app)/duel/[id]/replay/opengraph-image.tsx` (Next 16 OG image route). Use `ImageResponse` from `next/og` to render 1200×630 with the result card layout. Fetches `GET /replay/{id}` server-side.

**T12 — Wire-up + smoke**
- `npm test` should still pass (22+)
- `pytest` should still pass (20+, ideally +6-10 quest tests if you write them)
- `npm run build` — clean
- Manual test: complete a duel → quest panel updates → claim a quest → streak ticks → tier promotion (force by setting ELO to 999 in DB and winning) → ceremony plays → click "View replay" → timeline renders.

---

## Phase 3 — NOT STARTED

Per spec § 9:

- In-duel emotes (WS + tray UI, server rate-limit)
- Friend duel (private room codes, configurable rating curve)
- Open lobby browser (`/play/lobby`)
- Algorithm decks fully activated in problem picker (table writeable now, picker honors them, but UI for setting deck not built)
- Cosmetics (banners, frames, glyphs, signature anims) + unlock UI
- Async challenge end-to-end (`/play/async`)
- Spectate mode (read-only `/ws/duel/{id}`)
- Smurf-check tuning and anti-abuse hardening

The dashboard mode tiles already link to `/play/friend`, `/play/lobby`, `/play/async` — they currently 404 by design. Implementing Phase 3 will create those routes.

---

## Known caveats / gotchas for next session

1. **Python 3.9 compat:** This machine has Python 3.9. The pre-existing `schemas.py` had `str | None` syntax which fails at import time. I converted `UserCreate.cf_handle` to `Optional[str]`. **If you grep for `| None` in any `.py` file, convert it too.** The `from __future__ import annotations` line at top of new files helps for type hints, but Pydantic resolves them and will still fail on `| None` at class creation time.

2. **SQLite + new columns:** `Base.metadata.create_all()` runs at app startup. It creates **new tables** but **does NOT alter existing tables**. After adding columns to `User` / `Duel` (Phase 1), any **existing `codearena.db` file must be deleted** for the new columns to appear. The streak tests already handle this by `rm -f codearena.db` first. There is no Alembic migration generated — that was deferred.

3. **Duel state route collision:** Existing `duel_router` has `GET /duel/{duel_id}` returning the OLD `DuelOut` shape. My new endpoint at `/duel/{duel_id}/state` (in `main.py`) returns the NEW serialized state. **Frontend duel store calls `/duel/${id}/state`** — do not change it back.

4. **Tier promotion `new_tier` in WS payload:** Already emitted from `duel_completion.py`, but **`stores/duel.ts` does not yet read it into its `complete` field.** Extend the type `{ winnerId, eloChanges }` to `{ winnerId, eloChanges, promotion_for, new_tier }` and update the WS handler to set them.

5. **TypeScript ProfilePage imports break the build right now.** `app/(app)/profile/page.tsx` currently imports `EloSparkline` and `RecentDuelsList` from `@/components/profile/*` — those files don't exist yet. **Build will fail until T8 is done.** Either create stub components first or revert the profile page to the pre-T8 version while finishing other tasks.

6. **CF poller hits real Codeforces.** During heavy local dev it backs off. Don't be surprised by the "verdict sync paused" path.

7. **Quest tests not written.** `tests/services/test_quests.py` doesn't exist. The rule evaluators in `services/quests.py` work but aren't covered. Easy follow-up if/when you write them.

8. **Quest seeds depend on existing tables.** If you ever drop and re-create the DB, seeds re-insert on next app startup automatically (idempotent by slug).

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
cd frontend && npm test       # Vitest
cd backend && python3 -m pytest -v
```

**Full type + build check (frontend):**
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## Working notes for next session

When you pick this up:

1. **First, fix the build.** `frontend/app/(app)/profile/page.tsx` references components that don't exist. Either implement T8 first (EloSparkline + RecentDuelsList — quick to do) or comment out those two imports to unblock everything else.

2. **Then finish T6** — single small change in `duel_completion.py` to write the `duel_complete` row.

3. **T7 is the biggest remaining piece** — replay backend route + frontend timeline. Worth ~1 focused session.

4. **T10 (promotion ceremony) is mostly UI** — backend already emits the data.

5. **T11 (OG image) is small** — one file under `app/duel/[id]/replay/opengraph-image.tsx`.

The spec file is the source of truth for what each feature should look/feel like — re-read the relevant section before building each piece.
