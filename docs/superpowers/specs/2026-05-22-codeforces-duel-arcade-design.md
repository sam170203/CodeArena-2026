# CodeArena — Arcade Neon Codeforces Duel · Design Spec

**Date:** 2026-05-22
**Owner:** Aryan Pareek
**Status:** Approved for implementation planning
**Workspace:** `CodeArena-2026/` (rebuild inside existing repo)

---

## 1. Summary

CodeArena is a real-time competitive programming duel platform where players race up a ladder of Codeforces problems. The product is designed to be addictive and gamified in the spirit of Clash Royale, while keeping a classy, restrained aesthetic. Players link their Codeforces handle and submit on Codeforces itself — the platform never runs its own judge. We poll the Codeforces API to detect verdicts and drive the live duel HUD.

The existing `CodeArena-2026` repo already provides a FastAPI backend with users, duels, submissions, Codeforces problem fetching, and a WebSocket endpoint, plus a placeholder Next.js frontend. This spec covers a full rebuild of the frontend and a meaningful extension of the backend to support matchmaking, ranked progression, streaks, quests, decks, cosmetics, replays, and async challenges.

---

## 2. Decisions log

| Topic | Decision |
|---|---|
| Workspace | Rebuild inside `CodeArena-2026/frontend`. Reuse existing repo, package.json, Tailwind setup. |
| Aesthetic | **B · Arcade Neon** — synthwave/cyberpunk: hot pink + cyan + violet, glowing edges, Orbitron/JetBrains Mono, CRT scanlines on duel routes only. |
| Duel format | **Speedrun ladder of problems** — 5 problems, rating climbs each step, first to clear wins. |
| Submit / judge | Players submit on Codeforces. Backend polls CF API for verdicts. No own judge. |
| Gamification | ELO + leagues, streaks + quests, emotes + replay, decks + cosmetic profile cards — all in. |
| Matchmaking | Quick Match (ELO ±150), Friend duel (private room), Open lobby browser, Async challenge — all in. |
| Voice | Cinematic / ceremonial. "ENTER THE ARENA." "A CHALLENGER APPEARS." Capitalized solemnity, no emoji in copy. |
| Backend | Extend existing FastAPI as needed. New tables, endpoints, WS events, CF poller, matchmaker. |
| Devices | Desktop-first; mobile responsive on marketing/profile/leaderboard, "open on desktop" gate for `/duel`. |
| Theme | Dark only. |
| Router / language | Next 16 **App Router** + **TypeScript**. Migrate the existing JS Pages Router placeholder. |

---

## 3. Stack

- **Frontend:** Next 16 (App Router), TypeScript, Tailwind v4, Zustand, TanStack Query, native WebSocket, `framer-motion`. No Monaco — no in-app editor.
- **Backend (existing, extended):** FastAPI, SQLAlchemy, SQLite (already in use), Alembic migrations.
- **External:** Codeforces public API (`/api/user.status`, `/api/problemset.problems`). No own judge, no third-party runtime.

---

## 4. Information architecture

### 4.1 Routes

**Public:**
- `/` — landing. Logged-out: hero + register CTA. Logged-in: redirect to `/play`.
- `/leaderboard` — global ranks, filter by tier/division.
- `/login`, `/register` — auth.
- `/u/[handle]` — public profile, shareable, no auth required.

**App (auth-guarded):**
- `/play` — dashboard. Hero + 4 mode entries + recent duels + today's quests.
- `/play/queue` — full-screen "searching for opponent" view with cancel.
- `/play/lobby` — open lobby browser. (Phase 3)
- `/play/friend` — friend duel creation + join-by-code. (Phase 3)
- `/play/async` — async challenge inbox + send-new. (Phase 3)
- `/duel/[id]` — live duel HUD. Only route with CRT scanlines + arena-entrance animation.
- `/duel/[id]/replay` — post-duel timeline + shareable result card.
- `/profile` — own profile (settings link, deck editor, cosmetic equip).
- `/profile/settings` — CF handle, account, notification prefs.
- `/quests` — full quests view.

### 4.2 Persistent chrome

- **Left rail (72 px):** logo · Play (⚡) · Leaderboard (▲) · Quests (◆) · Profile (●) · Settings (⚙). Hover tooltips, active state on current route.
- **Top bar:** search (handles + problems) · live online count · user pill (avatar + handle + ELO + tier).

### 4.3 Folder layout

```
frontend/
  app/
    (marketing)/
      page.tsx                  ← landing
      leaderboard/page.tsx
      u/[handle]/page.tsx
    (app)/
      layout.tsx                ← rail + topbar, auth guard
      play/page.tsx             ← dashboard
      play/queue/page.tsx
      play/lobby/page.tsx       (Phase 3)
      play/friend/page.tsx      (Phase 3)
      play/async/page.tsx       (Phase 3)
      duel/[id]/page.tsx        ← live HUD
      duel/[id]/replay/page.tsx
      profile/page.tsx
      profile/settings/page.tsx
      quests/page.tsx
    login/page.tsx
    register/page.tsx
    api/                        ← Next route handlers only if needed (auth proxy, OG image)
  components/
    arena/                      ← LadderRail, OpponentPanel, ProblemCard, EmoteTray, ArenaEntrance
    cosmetic/                   ← TierBadge, Banner, AvatarFrame, SignatureAnim
    primitives/                 ← Button, Card, NeonText, ScanlineOverlay, StatTile, VerdictPill
    motion/                     ← shared transition variants
  lib/
    api.ts                      ← axios + JWT interceptor
    ws.ts                       ← typed WS client (queue, duel, user channels)
    cf.ts                       ← CF helpers (handle validation, problem URL builders)
    elo.ts                      ← pure ELO math
    streak.ts                   ← timezone-aware streak helpers
  stores/
    auth.ts, duel.ts, queue.ts, emote.ts, quest.ts
  types/
    duel.ts, user.ts, ws-events.ts, cf.ts, quest.ts
  styles/
    globals.css                 ← Tailwind + design tokens (CSS custom props)
```

---

## 5. Visual system

### 5.1 Palette (CSS custom properties)

```
--bg-void:    #07020F
--bg-haze:    #0E0425   (radial gradients sit here)
--surface:    #1A0A35   (cards, panels)
--surface-2:  #251355   (raised)
--border:     rgba(168, 85, 247, 0.22)
--border-hot: rgba(236, 72, 153, 0.50)

--neon-pink:   #EC4899   ← primary action, loss
--neon-cyan:   #22D3EE   ← info, secondary action
--neon-violet: #A855F7   ← brand surfaces
--neon-gold:   #FBBF24   ← victory, rare cosmetics
--ok-green:    #34D399   ← AC only
--fail-red:    #EF4444   ← WA/RE/etc. only

--text-1: #F5F0FF   (most important moments only)
--text-2: #C4B8E0   (default body)
--text-3: #7A6FA3
--text-4: #443C66
```

**Rules:**
1. One pink+glow primary action per page.
2. Scanline + CRT flicker live only on `/duel/*` routes.
3. `prefers-reduced-motion` kills all motion.
4. No pure black — always faint violet haze.
5. Body text is `text-2`, not white. Save white for moments.
6. Emotes are SVG glyphs, never Unicode emoji.

### 5.2 Typography

- **Display:** Orbitron 900 — page heroes ("ENTER THE ARENA"), VICTORY / DEFEAT.
- **Heading:** Inter 700 — section titles.
- **Body:** Inter 400/500 — paragraph copy.
- **Mono:** JetBrains Mono — timers, ELO numbers, CF problem IDs, code-references, eyebrows.

### 5.3 Tier badges

7 tiers with 3 divisions each (except Legend):

| Tier | ELO range | Color treatment |
|---|---|---|
| Bronze III/II/I | 0 – 999 | Amber-brown gradient |
| Silver III/II/I | 1000 – 1299 | Slate-silver gradient |
| Gold III/II/I | 1300 – 1599 | Gold gradient |
| Platinum III/II/I | 1600 – 1899 | Cyan gradient |
| Diamond III/II/I | 1900 – 2199 | Violet gradient |
| Master III/II/I | 2200 – 2499 | Hot-pink gradient |
| **Legend** | 2500 + | Animated conic-gradient (rainbow), no divisions |

### 5.4 Motion language

| Variant | Use |
|---|---|
| **arena-entrance** | Cinematic transition into a duel. Vignette inward, scanlines flash, opponent name materializes letter-by-letter (~1.2 s). Skippable. |
| **number-ticker** | All ELO/streak/score changes count up/down with easing. Pink on loss, cyan on gain. |
| **glow-pulse** | Subtle 3 s pulse on the single primary CTA. |
| **shatter-verdict** | Opponent AC → their card glows green + brief screen flash. Your AC → slam-zoom to next problem. |
| **crt-flicker** | 3 % scanline overlay on `/duel/*` only. |
| **promotion-ceremony** | Full-screen tier-crossing celebration (~2.5 s). Old badge dissolves, new badge assembles, tier name in display type. Most premium moment in the app. |

---

## 6. Core duel mechanics

### 6.1 Speedrun ladder

- **5 problems per ladder.** Length is a per-format default; friend duels can override (Phase 3).
- **Rating curve** based on the lower-rated player's ELO. Steps = `[base − 200, base − 100, base, base + 100, base + 200]`.
- **Problem selection:** at duel start, backend picks 5 CF problems matching each step's rating, **excluding** problems either participant has already AC'd.
- **Same 5 problems for both players** — no asymmetry.
- **Independent advance.** Each player advances as they AC steps.
- **Win condition:** first to clear step 5. Time-cap tie → most steps cleared, then total time across cleared steps.
- **Time cap:** 45 min default, configurable.
- **Skip (Phase 3):** abandon current step with a 5-min penalty; can return after clearing the next.

### 6.2 Submit & verdict flow

1. Duel HUD shows current step's problem card with title, rating, tags, and a big **"OPEN ON CODEFORCES"** deep link.
2. Player submits on Codeforces — we do not render a code editor.
3. `CodeforcesVerdictPoller` polls `https://codeforces.com/api/user.status?handle={cf_handle}&from=1&count=5` for each participant every **3 s**.
4. Match submissions by `problem.contestId/index` AND `creationTimeSeconds >= duel.started_at`.
5. New submission → broadcast WS `verdict` event. HUD shows verdict pill with brief shake.
6. `verdict == "OK"` → broadcast WS `step_advance`. HUD slam-zooms to next step.
7. Either player clears step 5 → broadcast WS `duel_complete`, freeze submissions.

### 6.3 Pre-duel: matchmaking → arena entrance

1. Player clicks "ENTER ARENA" → `POST /matchmaking/enqueue`.
2. Frontend connects `/ws/queue/{user_id}` and shows full-screen searching overlay with cancel.
3. Backend worker matches ±150 ELO every 1 s tick. Window expands to ±300 after 60 s, ±500 after 120 s.
4. Match → backend creates Duel + DuelSteps, broadcasts `match_found` to both.
5. Frontend plays **arena-entrance** transition → navigates to `/duel/[id]`.

### 6.4 Post-duel: ceremony → replay

1. `duel_complete` → HUD freezes, cinematic overlay drops with "VICTORY." or "DEFEAT." in display type.
2. Stat panel shows opponent name, **ELO ±** counting via number-ticker.
3. If duel crosses a tier boundary, **promotion-ceremony** plays before the stat panel.
4. Trio of CTAs: **REMATCH** · **VIEW REPLAY** · **BACK TO ARENA**.
5. Replay route loads via `GET /replay/{duel_id}` returning the serialized event stream.

### 6.5 State machine — `Duel.status`

`pending` (in queue/lobby) → `matched` (problems being picked) → `active` (live) → `complete` (winner decided) → `archived` (replay served).

### 6.6 Failure modes

| Mode | UX |
|---|---|
| CF API rate-limit/outage | Poller exponential backoff up to 60 s. HUD banner: "verdict sync paused — submissions still count." |
| Player disconnects | Duel keeps running server-side. Opponent's step indicator dims with "reconnecting…". Duel ends only on time-cap or step 5. |
| CF handle unset | Dashboard blocks Quick Match with link-handle prompt to settings. |
| Problem-pick conflict (both already AC'd a candidate) | Picker backfills; duel start delayed up to 2 s. |
| Both clear step 5 in same poll tick | Earliest `creationTimeSeconds` wins. Sub-second tie → coin-flip toast, both get half-ELO. |

---

## 7. Gamification systems

### 7.1 ELO math

```
expected = 1 / (1 + 10^((opp_elo − my_elo) / 400))
delta    = round(K * (actual − expected))
actual: win = 1, draw = 0.5, loss = 0
```

K-factor by tier: **Bronze/Silver 40, Gold/Platinum 32, Diamond 24, Master/Legend 16**.
ELO floored at 0. Async-mode duels use K = 16 always and feed a separate `async_elo` field.

### 7.2 Leagues / tiers

7 tiers, 3 divisions each except Legend. Promotion → full **promotion-ceremony** overlay. Demotion → quiet purple toast, no shame.
**Seasonal soft-reset every 90 days:** Master 2300 → 2000, Diamond → 1800, etc. Bronze/Silver untouched.

### 7.3 Daily streak

- Counter = consecutive days with ≥ 1 ranked duel completed.
- Resets at **midnight user-local time**. Timezone captured from browser, stored on `User`.
- **Streak shield:** first 7-day streak grants 1 auto-shield (absorbs a missed day). More shields via quests. Max stack = 3.
- Visual: flame color shifts pink (1–6) → gold (7–29) → white-hot (30+).

### 7.4 Quests

- **3 daily + 1 weekly** per user. Daily rotates at user-local midnight; weekly on Monday.
- Pool of ~20 parameterized templates: win N ladders, clear a {rating}+ step, win with no WA, win in <15 min, win vs. {tier}+, use 3 different emotes (Phase 3), win using a deck containing {tag}.
- Rewards: XP (50–300), cosmetic shards (3–5), occasional streak shields.
- Server-validated; client receives signed progress.

### 7.5 Decks (algorithm tags)

- User picks **up to 3 tags** for the active deck (default + per-queue override).
- Problem picker prefers **intersection of both decks**. Fallback: union → unrestricted (with "decks ignored" toast).
- Tags from CF taxonomy: `dp`, `graphs`, `greedy`, `math`, `implementation`, `strings`, `data structures`, `geometry`, `number theory`, `two pointers`, `dfs and similar`, `binary search`, `combinatorics`, `bitmasks`.
- 3 slots for everyone day-1. No paywall.

### 7.6 Cosmetics

4 axes, all visual, zero power:
1. **Banner** — gradient/pattern behind user pill and profile header.
2. **Frame** — avatar border style.
3. **Avatar glyph** — single Orbitron character on the avatar tile.
4. **Signature anim** — brief flourish on arena entrance.

Sources: quest shards stack into unlocks · first-time tier promotions grant the tier's signature banner · seasonal exclusives at season-end. **No paid currency in v1.**

### 7.7 XP / level

- Sources: quests, duels (win = 50 XP, loss = 15 XP), streak milestones (7d = 100, 30d = 500, 100d = 2000).
- Level = `floor(sqrt(XP / 100))`.
- Purely a time-invested badge on the profile. No gameplay impact.

### 7.8 Async challenge (Phase 3)

- Sender picks opponent handle + 5-problem seed. Sender plays first within 90 min.
- Opponent has 24 h to start; once started, same 90 min window.
- Result revealed when opponent finishes or 24 h timeout.
- Affects only `async_elo`. K = 16.

### 7.9 Anti-abuse

- Matchmaking enqueue rate-limit: max 3 enqueues in 2 min.
- Verdict ingestion checks `creationTimeSeconds >= duel.started_at`.
- Quest progression entirely server-validated.
- Smurf check: if CF rating exceeds internal ELO by 500+, ELO gain capped at +5 against much lower opponents.

---

## 8. Backend extensions

### 8.1 New tables (`backend/app/models.py`)

```
DuelStep
  id, duel_id (FK), step_index (0..4), rating,
  problem_id, problem_contest_id, problem_index, problem_name, problem_tags_json,
  status_for_host (pending|solved|skipped), host_solved_at,
  status_for_opponent (pending|solved|skipped), opp_solved_at

MatchmakingQueueEntry
  id, user_id (FK, unique), mode (speedrun_ladder),
  elo_at_enqueue, deck_tags_json, enqueued_at, expires_at

EloHistory
  id, user_id, duel_id, elo_before, elo_after, delta, opponent_id, result (win|loss|draw), created_at

Streak
  user_id (PK), current_count, longest_count, last_duel_local_date, shields_remaining, timezone

Quest
  id, slug, title_template, kind (daily|weekly), rule_json,
  xp_reward, shard_reward, shield_reward

QuestProgress
  id, user_id, quest_id, rolled_for_date, progress_json, completed_at, claimed_at

Deck
  user_id (PK), tags_json (max 3), updated_at

CosmeticUnlock
  id, user_id, axis (banner|frame|avatar_glyph|signature), key, unlocked_at, source

EquippedCosmetic
  user_id (PK), banner_key, frame_key, avatar_glyph_key, signature_key

AsyncChallenge
  id, sender_id, recipient_id, status (sent|accepted|sender_done|complete|expired),
  problem_seed_json, sender_started_at, sender_finished_at,
  recipient_started_at, recipient_finished_at,
  sender_steps_cleared, recipient_steps_cleared,
  winner_id, created_at, expires_at

ReplayEvent
  id, duel_id, ts_offset_ms, user_id (nullable for system events),
  event_type (submission|verdict|step_advance|emote|duel_start|duel_complete),
  payload_json
```

Existing-table additions: `User.timezone`, `User.async_elo`, `User.xp`, `User.level`; `Duel.format` (default `"speedrun_ladder"`), `Duel.time_cap_seconds`, `Duel.ladder_seed_json`.

### 8.2 New REST endpoints

| Method · Path | Purpose |
|---|---|
| `POST /matchmaking/enqueue` | `{mode, deck_tags?}` → `{queue_id, eta_seconds}`. |
| `DELETE /matchmaking/queue/{queue_id}` | Cancel queue. |
| `GET /duel/{id}` | Full duel state incl. steps + opponent profile. |
| `GET /replay/{duel_id}` | Replay event stream + final stats. Public, no auth. |
| `GET /leaderboard?tier=&div=&limit=&offset=` | Paginated leaderboard. |
| `GET /profile/{handle}` | Public profile. |
| `PUT /profile/deck` | `{tags: [...]}` (max 3). |
| `PUT /profile/cosmetic` | `{banner?, frame?, glyph?, signature?}`; must be unlocked. |
| `GET /quests/today` | Daily + weekly with progress. |
| `POST /quests/{id}/claim` | Claim completed quest rewards. |
| `POST /async-challenge` | `{recipient_handle, problem_seed?}`. |
| `POST /async-challenge/{id}/accept` | Recipient accepts. |
| `GET /async-challenge/inbox` | Pending challenges. |
| `GET /cf/handle/{handle}/validate` | Verify CF handle exists. |

### 8.3 WebSocket channels

**`/ws/queue/{user_id}` — server pushes:**
- `queue_tick { eta_seconds, queued_count }` every 2 s
- `match_found { duel_id, opponent: { handle, elo, tier, cosmetics } }`

**`/ws/duel/{duel_id}` — extended. Inbound: `emote {glyph}`, `ping`. Outbound:**
- `state { ...full duel state }`
- `verdict { user_id, step_index, verdict, testset?, submission_id }`
- `step_advance { user_id, new_step_index }`
- `emote { user_id, glyph, sent_at }`
- `duel_complete { winner_id, elo_changes: { user_id: { before, after, delta } }, promotion_for?: user_id }`
- `opponent_disconnected { user_id, reconnect_grace_ms }`

**`/ws/user/{user_id}` — lightweight per-user notifications:**
- `quest_complete { quest_id }`, `tier_changed`, `async_challenge_received`, etc.

All payloads carry a `type` discriminator; the TS client uses an exhaustive `DuelEvent` union.

### 8.4 Codeforces verdict poller (`backend/app/services/cf_poller.py`)

- Single asyncio task spawned at app startup.
- Tick = 3 s. Per tick:
  - For each `Duel.status == "active"`, call `user.status?handle={cf}&from=1&count=5` per participant.
  - Filter: `creationTimeSeconds >= duel.started_at` AND problem matches current step.
  - New submission → insert `ReplayEvent` + broadcast `verdict` WS event.
  - `OK` → mark step solved + broadcast `step_advance`. Step 5 cleared → `complete_duel(...)` writes `EloHistory`, updates user ELO/tier/XP/streak, broadcasts `duel_complete`.
- Per-handle min-interval lock keeps under CF rate limits (~1 req/s/handle).
- On 429 or 5xx: exponential backoff up to 60 s; WS banner emitted to active duels.
- In-memory cache `{handle → last_seen_submission_id}` avoids reprocessing.

### 8.5 Matchmaking worker (`backend/app/services/matchmaker.py`)

- Single asyncio task, tick = 1 s.
- Iterates `MatchmakingQueueEntry` by enqueue time.
- Finds another queued user within ±150 ELO (expand to ±300 @ 60 s, ±500 @ 120 s).
- On match: create `Duel`, generate `DuelStep` rows via `problem_picker`, delete both queue entries, broadcast `match_found` to both via their queue sockets.

### 8.6 Problem picker (`backend/app/services/problem_picker.py`)

- Pulls CF problemset (cached 24 h locally).
- Filters by step rating ±50 and by deck-tag intersection.
- Excludes problems either user has AC'd (CF `user.status`, 24 h cache).
- Returns 5 problems in ascending rating order. If candidate pool is exhausted, widens rating by ±100 and retries.

### 8.7 Quest tick

On every `duel_complete`, evaluate active quest rules server-side against the duel outcome. Update `QuestProgress`. Broadcast `quest_complete` toast via user WS.

### 8.8 Auth & middleware

- Existing JWT flow stays.
- New middleware: `/matchmaking/*` and `/async-challenge/*` require linked CF handle.
- Timezone captured on first authed request and persisted.

---

## 9. Phasing

### Phase 1 — Core loop (ship target: working ranked duel end-to-end)

- App Router + TypeScript migration of `frontend/`.
- Auth pages, JWT wiring, CF handle linking flow.
- Persistent rail + topbar shell.
- `/play` dashboard (Quick Match CTA + recent duels stub).
- `/play/queue` searching overlay + queue WS.
- Backend: matchmaker worker, problem picker, `MatchmakingQueueEntry`, `DuelStep`, `EloHistory`.
- `/duel/[id]` live HUD: ladder rail, opponent panel, problem card, CF deep link, timer, verdict pills.
- Backend: CF verdict poller, extended duel WS events.
- Win/lose ceremony overlay + basic ELO update (no tiers yet).
- Leaderboard route (basic, no tier filter).

### Phase 2 — Status & retention

- Tiers + divisions, promotion-ceremony, demotion toast.
- Daily streak system (timezone capture, flame counter, shield).
- Quests system (3 daily + 1 weekly), `/quests` route, dashboard panel.
- Profile route (`/profile`, `/u/[handle]`), recent duels list, ELO history chart.
- Profile settings route (CF handle, deck editor — Deck table writable but unused until P3).
- Post-duel replay (`/duel/[id]/replay`) reading `ReplayEvent` stream.
- Shareable result card (OG image route).

### Phase 3 — Personality & breadth

- In-duel emotes (WS + tray UI, server rate limit).
- Friend duel (private room codes, configurable rating curve).
- Open lobby browser (`/play/lobby`).
- Algorithm decks fully activated in problem picker.
- Cosmetics (banners, frames, glyphs, signature anims) and unlock UI.
- Async challenge end-to-end (`/play/async`).
- Spectate mode (read-only `/ws/duel/{id}`).
- Smurf-check tuning and anti-abuse hardening.

---

## 10. Testing strategy

- **`lib/elo.ts`** — pure unit tests (Vitest). Win/loss/draw, K-factor by tier, ELO floor, integer rounding.
- **`lib/streak.ts`** — pure unit tests for timezone-aware date arithmetic, shield consumption.
- **Backend matchmaker** — pytest. Window expansion, deck intersection, queue ordering, race conditions on concurrent enqueue.
- **Backend CF poller** — pytest with mocked CF API. Verdict matching, backoff, race when both clear step 5.
- **WS event union** — TypeScript exhaustiveness checked at compile time (never-branches).
- **Critical user flows** — Playwright: quick match → duel → ceremony, CF handle link, quest claim, streak preservation across timezone boundaries.
- **Manual smoke** — full duel against a self-account on staging before each phase ships.

---

## 11. Open questions (none blocking spec; resolve during implementation)

1. Storage for cosmetic art assets — static in `public/cosmetics/` vs. served via S3-like bucket? Lean static for v1.
2. CF problem refresh cadence — once a day cron vs. on-demand cache miss? Lean cron.
3. Friend duel rating-curve config UI — preset profiles (easy/medium/hard) vs. raw rating array? Lean presets.
4. Should `async_elo` be visible on the public profile or hidden? Lean visible but separately labelled.
