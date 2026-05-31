# Reported Issues — Triage & Resolution Log

Bugs reported via the Excel spreadsheet, plus what we did about each.

| # | Bug | Status | Fixed in | Notes |
|---|---|---|---|---|
| 1 | "User not found" — registered account wiped by container restart | **✅ Fixed** | `5744416`, `2bf4cf7` | DATABASE_URL wired on Render → users now persist in Postgres. Frontend interceptor auto-clears stale tokens on 401/404 |
| 2 | Couldn't log in after registering — backend's SQLite reset | **✅ Fixed** | Same | Same root cause as #1 |
| 3 | Friend duel partner gets the error too | **✅ Fixed** | Same | Same root cause as #1 |
| 4 | **Emotes hidden** | **✅ Fixed** | `(this commit)` | Emote tray button is now bigger, cyan-bordered, glowing; popover z-index raised to `z-[90]`; better mobile fit |
| 5 | **Solve status not updating** ("Step 1 / 5 · 0 solved" after AC) | **✅ Mitigated** | `(this commit)` | Two fixes: (a) `step_advance` WS handler now looks up step by `step_index` field rather than array position — handles edge cases; (b) periodic 10s state refresh self-heals if a WS event is ever missed; (c) heartbeat ping every 25s keeps WS alive through Render's proxy |
| 6 | Focus more on battle dashboard | ✏️ Planned | — | Not in this push. Worth a brainstorm session — see "Open" below |
| 7 | No options for duel type (fast/slow, # questions) | ✏️ Planned | — | Friend duels already have 3 rating presets (chill/medium/hard). Adding "# of problems" requires a backend change — see "Open" below |
| 8 | **Forfeit doesn't work / delayed** | **✅ Fixed** | `(this commit)` | Forfeit modal now shows a clear "// ENDING DUEL" spinner immediately on click. Backend response is also used for an optimistic local state update so the user sees feedback in <1s instead of waiting for the WS event |
| 9 | **Change icon** | **✅ Fixed** | `(this commit)` | Custom favicon and Apple touch icon — sword glyph (⚔) on the pink→violet brand gradient. Replaces the default Next.js icon |

---

## What's still open

### #6 — Battle dashboard focus

Suggestion to make the dashboard more "battle-forward". Concrete ideas to discuss:
- Bigger ENTER ARENA CTA (already largest element, could be even bigger)
- Show currently-queued count + live activity feed (people in matches right now)
- Trend graph of YOUR ELO over time
- "Top duels of the day" carousel — replays of high-ELO matches
- A leaderboard sliver showing your rank and next/previous players

Want to brainstorm? Run `/brainstorm` (or just describe what you have in mind) and we'll iterate.

### #7 — Duel type options (fast/slow, # of questions)

Currently only friend duels have customization (3 rating presets). To add # of problems and pace:

**Backend:**
- Add `num_steps` (default 5) and `time_cap_seconds` (default 2700) overrides to FriendRoom
- Modify problem_picker to accept variable step count
- Update DuelStep creation to use that count

**Frontend (friend-duel page):**
- Two new selectors: number of problems (3/5/7) + pace (fast=10min, normal=45min, slow=90min)
- Show the chosen config prominently

~1 hour of work. Want it next?

---

## Self-healing mechanisms introduced this push

To prevent silent failures like Bug #5 from happening again, the duel HUD now has:

1. **WebSocket heartbeat ping every 25s** — keeps the connection alive through Render's edge proxy, which kills idle connections after ~60s. Without this, the WS goes silent and verdict events stop flowing.

2. **Periodic full-state refresh every 10s during active duel** — even if a WS event is dropped (network blip, server hiccup, browser tab backgrounded), the HUD re-fetches the authoritative state and converges. Costs one tiny GET request per 10s.

3. **Optimistic local state on forfeit** — the moment the API accepts the forfeit, the client sets `complete` state immediately (using the winner_id from the API response) rather than waiting for the WS event. The WS event arrives later and fills in elo_changes for the VictoryOverlay.

4. **Better step-advance handler** — looks up steps by `step_index` field rather than array position, so it works even if steps are out of order in the array.

These are defensive — they don't fix the bug, they make it self-recover when it happens. Combined with the actual bugfixes, the system is much more resilient.
