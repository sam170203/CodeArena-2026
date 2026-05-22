# CodeArena Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land the status-and-retention layer — tier badges with divisions, daily streaks, quests system, post-duel replay, ELO history chart, public profiles, promotion ceremony, and OG share images. Everything that makes a Phase 1 duel *feel like it mattered* after it ends.

**Spec reference:** `docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md` § 5.3, 7.2–7.7, 9.

**Tech stack:** unchanged from Phase 1.

---

## File map

**Backend:**
- Modify: `app/models.py` — add `Streak`, `Quest`, `QuestProgress`, `ReplayEvent` tables
- Modify: `app/main.py` — wire new routes
- Modify: `app/services/duel_completion.py` — write `ReplayEvent`s, update streaks, evaluate quests, flag tier promotion
- Modify: `app/services/cf_poller.py` — emit `ReplayEvent` rows for verdict/step events
- New: `app/services/streak.py`, `app/services/quests.py`
- New: `app/api/routes/streak.py`, `app/api/routes/quests.py`, `app/api/routes/replay.py`, `app/api/routes/profile.py`
- New: `tests/services/test_streak.py`, `tests/services/test_quests.py`

**Frontend:**
- New: `components/cosmetic/TierBadge.tsx`
- New: `components/arena/PromotionCeremony.tsx`
- New: `components/dashboard/StreakBadge.tsx`, `QuestsPanel.tsx` (replaces stub)
- New: `components/profile/EloSparkline.tsx`, `RecentDuelsList.tsx`
- New: `components/replay/{ReplayTimeline,ResultCard}.tsx`
- New: `app/(app)/quests/page.tsx`
- New: `app/(app)/duel/[id]/replay/page.tsx`
- New: `app/(marketing)/u/[handle]/page.tsx`
- New: `app/duel/[id]/replay/opengraph-image.tsx` (Next OG image)
- Modify: `app/(app)/profile/page.tsx` — drop placeholder, embed `RecentDuelsList` + `EloSparkline`
- Modify: `components/dashboard/ProfileMicroCard.tsx` — add `StreakBadge`
- Modify: `components/arena/VictoryOverlay.tsx` — chain into `PromotionCeremony` when applicable, link to `/duel/[id]/replay`
- New: `lib/streak.ts`, `lib/format.ts`
- New: `types/quest.ts`, `types/replay.ts`
- New: `tests/lib/streak.test.ts`

---

## Task 1 — Tier badge component + integrate everywhere

**Files:** `frontend/components/cosmetic/TierBadge.tsx`, update UserPill/ProfileMicroCard/ProfilePage/Leaderboard to use it.

- [ ] Create `TierBadge.tsx` with the 7 tier color gradients from spec § 5.3, three sizes (`sm` 28px, `md` 44px, `lg` 64px), optional division numeral overlay, optional glow ring.
- [ ] Use it in `UserPill`, `ProfileMicroCard`, `ProfilePage`, `Leaderboard` rows, `OpponentPanel` (small).

## Task 2 — Streak math lib + backend tracking

**Files:** `lib/streak.ts`, `tests/lib/streak.test.ts`, `backend/app/services/streak.py`, `backend/tests/services/test_streak.py`, `backend/app/models.py` (Streak table).

- [ ] Frontend `streak.ts` — pure functions: `flameColor(count)` ("pink"/"gold"/"white-hot"), `streakFlameGlyph(count)` ("⟁").
- [ ] Backend `Streak` model: `user_id PK, current_count, longest_count, last_duel_local_date, shields_remaining, timezone`.
- [ ] Backend `streak.py` service: `tick_streak(db, user, completion_dt_utc)` — converts to user-local date, increments on new day, decrements/breaks on missed day (after shield consumption), updates `longest_count`. Returns `(was_kept, broke, used_shield)`.
- [ ] Wire into `complete_duel(...)` after ELO update.
- [ ] Backend tests for: first duel, same-day re-play (no change), next-day continue, two-day gap consumes shield, three-day gap breaks streak, timezone boundary correctness.

## Task 3 — Streak UI on dashboard

**Files:** `components/dashboard/StreakBadge.tsx`, update `ProfileMicroCard.tsx`.

- [ ] `StreakBadge` reads `useAuth().user.streak` (we expand `/auth/me` response in this task).
- [ ] Modify backend `/auth/me` schema to include `streak: { current_count, longest_count, shields_remaining }`.
- [ ] Frontend `User` type updated. ProfileMicroCard renders a flame row with color-shifting glow per spec.

## Task 4 — Quest models + rotation + evaluation

**Files:** `backend/app/models.py` (Quest, QuestProgress), `backend/app/services/quests.py`, `backend/tests/services/test_quests.py`.

- [ ] `Quest` table: `id PK, slug, title_template, kind (daily|weekly), rule_json, xp_reward, shard_reward, shield_reward`.
- [ ] `QuestProgress` table: `id PK, user_id, quest_id, rolled_for_date, progress_json, completed_at, claimed_at`.
- [ ] Seed ~10 quest templates on app startup (idempotent insert by slug).
- [ ] `quests.py`: `roll_today_for(user)` → ensures 3 daily + 1 weekly progress rows exist for current user-local date.
- [ ] `evaluate_after_duel(db, user, duel, result)` — checks each active quest's rule against this duel, updates `progress_json`, marks `completed_at` if criteria met.
- [ ] Tests for the rule evaluators: "win N ladders", "clear a {rating}+ step", "win without WA", "win under 15min".

## Task 5 — Quests routes + dashboard panel + /quests page

**Files:** `backend/app/api/routes/quests.py`, `frontend/components/dashboard/QuestsPanel.tsx` (replaces stub), `frontend/app/(app)/quests/page.tsx`, `types/quest.ts`.

- [ ] `GET /quests/today` — returns rolled-out daily + weekly with progress + completion state.
- [ ] `POST /quests/{id}/claim` — marks claimed_at, credits user XP/shards/shields.
- [ ] Frontend `QuestsPanel` — 3 quest rows with title, reward, progress bar, claim button.
- [ ] `/quests` page — same panel full-width with weekly header section.

## Task 6 — ReplayEvent storage + ingest

**Files:** `backend/app/models.py` (ReplayEvent), modify `app/services/cf_poller.py` to write rows on every verdict/step_advance, modify `app/services/duel_completion.py` to write `duel_complete` row.

- [ ] `ReplayEvent` table: `id, duel_id, ts_offset_ms, user_id (nullable), event_type, payload_json`.
- [ ] On every CF poller verdict broadcast → also insert row.
- [ ] On `duel_complete` → insert row with payload containing winner_id + elo_changes.

## Task 7 — Replay route + timeline UI + share card

**Files:** `backend/app/api/routes/replay.py` (`GET /replay/{duel_id}` public), `frontend/app/(app)/duel/[id]/replay/page.tsx`, `frontend/components/replay/{ReplayTimeline,ResultCard}.tsx`, `types/replay.ts`.

- [ ] Backend: returns full event stream + final stats. No auth required.
- [ ] Frontend timeline: vertical track, alternating columns per player, verdict pills with relative timestamps, step-advance markers, AC moments highlighted.
- [ ] `ResultCard` — shareable summary: VICTORY/DEFEAT title, both names with ELO ±, duration, share button (copies link).
- [ ] Update `VictoryOverlay` to add "View replay" link to `/duel/[id]/replay`.

## Task 8 — Profile expansion + ELO sparkline + recent duels list

**Files:** `frontend/components/profile/{EloSparkline,RecentDuelsList}.tsx`, modify `app/(app)/profile/page.tsx`, new backend `GET /profile/me/elo-history`.

- [ ] Backend endpoint returns last 50 `EloHistory` rows.
- [ ] `EloSparkline` — SVG line chart of ELO over last 50 duels with tier band guides.
- [ ] `RecentDuelsList` — reuses `/duel/recent/me`, full list with click-through to replay.
- [ ] Profile page replaces "lands in Phase 2" stubs with these.

## Task 9 — Public profile `/u/[handle]`

**Files:** `frontend/app/(marketing)/u/[handle]/page.tsx`, backend `GET /profile/by-handle/{handle}`.

- [ ] Backend route returns: username, cf_handle, elo, tier, division, wins/losses, recent duels (read-only), streak, xp, level (level = floor(sqrt(xp/100))).
- [ ] Public page — no auth required. Hero with TierBadge LG, stat grid, recent duels list.

## Task 10 — Promotion ceremony

**Files:** `frontend/components/arena/PromotionCeremony.tsx`, modify `VictoryOverlay.tsx` and `duel/[id]/page.tsx`.

- [ ] Backend `duel_complete` WS event already carries `elo_changes`. Add `promotion_for: user_id | null` and `new_tier: TierKey | null`.
- [ ] In `duel_completion.py`: compute `tier_for_elo(before) != tier_for_elo(after)` for each side; promotion = `tier_for_elo(after).min_elo > tier_for_elo(before).max_elo` (i.e. moved UP).
- [ ] `PromotionCeremony` — full-screen overlay, old badge dissolves (particles), new badge assembles, tier name in display type. ~2.5s, then auto-resolves into the VictoryOverlay stat panel.
- [ ] Demotion: quiet purple toast "tier dropped" — no ceremony.

## Task 11 — OG share image for replay

**Files:** `frontend/app/duel/[id]/replay/opengraph-image.tsx`.

- [ ] Next.js OG image route — renders a 1200×630 image with VICTORY/DEFEAT, both player names, ELO ±, signature CodeArena branding. Reads from `/replay/{id}` API.
- [ ] Verify with `next dev` and a Twitter Card validator.

## Task 12 — Wire up + smoke + tests

- [ ] Run vitest + pytest. All pass.
- [ ] Run `next build`. Clean.
- [ ] Manual: complete a duel → see VictoryOverlay + (if applicable) PromotionCeremony → click "View replay" → timeline renders → share link copies → check profile updates (ELO history, recent duels, streak).
