# Zombie Chase — Run Mini-Game Spec

> Status: **Draft for sign-off** — do not implement until approved.

## 1. Goal

A new `run.html` page in HABITHACKZ that turns running into a zombie-chase mini-game:

- User taps **Start Chase** to begin a top-down endless-runner through a township.
- Zombies close in from behind. The user must tap a **Sprint** button to outrun them.
- A target distance (scaled by rank) must be reached to win.
- On win, the run is logged as a real "Run" activity (so existing quest/XP/coin/streak/badge wiring fires automatically), and a new "Survived the Chase" badge is awarded.
- On loss (zombie catches the player), the run does **not** count toward the activity log, but the user keeps any XP/coins already earned from the run's progress milestones.

## 2. User Flow

```
Activity page / Dashboard "Quick Action"
  -> run.html
       -> Auth gate (HQ.requireAuth)
       -> "Start Chase" CTA
            -> Countdown 3-2-1-GO
                 -> Game loop begins
                      -> Tap "Sprint" to outrun zombies
                      -> Auto-run: distance + meters/sec ticks up
                      -> Tap "Sprint": stamina drains, player speed boosts
                      -> Stamina regenerates when not sprinting
                      -> Zombie gap shrinks if player is too slow
                      -> Distance bar fills toward target
                      -> Win:  target reached    -> confetti + reward screen
                      -> Lose: zombie touches    -> game-over screen
            -> Post-run summary: distance, time, avg pace, XP gained, badges
            -> "Run Again" or "Back to Dashboard"
```

## 3. Game Mechanics

### 3.1 Distance target by rank

| Rank | Target distance |
|------|-----------------|
| Bronze | 1000 m |
| Silver | 1500 m |
| Gold | 2000 m |
| Platinum | 3000 m |
| Diamond | 4000 m |

Defaults to Bronze if rank is unknown.

### 3.2 Player

- **Base speed:** 3.0 m/s
- **Sprint speed:** 6.0 m/s
- **Stamina:** 100 units, max 100
- **Stamina drain while sprinting:** 25 units / second
- **Stamina regen when not sprinting:** 15 units / second
- **Min stamina to sprint:** 10 (button shows locked state below this)

### 3.3 Zombies

- **Zombie base speed:** 2.8 m/s (slightly slower than player base)
- **Zombie sprint speed:** 5.5 m/s (when gap is large, they speed up to chase)
- **Zombie gap:** starts at 60 m behind player, shrinks at `(zombieSpeed - playerSpeed)` m/s when player is slower, grows at `(playerSpeed - zombieSpeed)` m/s when player is faster
- **Clamp gap to [0, 120] m** so zombies stay visible
- **Visual:** a single zombie sprite 60m back (it's a demo, no need to spawn dozens)
- **Catching the player** = zombie gap reaches 0

### 3.4 Milestone rewards (during the run)

The player earns small XP/coin drips at distance milestones so a loss still feels rewarding:

| Milestone | XP | Coins |
|-----------|----|-------|
| 250 m | 5 | 1 |
| 500 m | 10 | 2 |
| 1000 m | 25 | 5 |
| 1500 m | 40 | 8 |
| 2000 m | 60 | 12 |
| 3000 m | 100 | 20 |
| 4000 m | 150 | 30 |

Milestone fired once per (milestone, run). Already-fired milestones are tracked in-memory for the current run only.

### 3.5 Win reward

On reaching the rank-scaled target distance, the entire run is logged as a `Run` activity with `duration` and `distance` populated, which:

- Adds XP via `HQ.activityXP` (run formula: `max(10, round(dur * 1.5 + dist * 8))`)
- Adds coins (`Math.floor(xp / 6)`)
- Adds community points (`Math.floor(xp / 10)`)
- Updates streak
- Triggers `recordActivityForQuests` so any matching daily/weekly quests auto-complete
- Awards the **Survived the Chase** badge if not already owned
- Bumps township points (+5)

### 3.6 Lose handling

On zombie catch:

- Game-over overlay with stats (distance reached, time, milestones hit)
- "Try Again" button (resets the game)
- XP/coins earned from milestones are persisted via `HQ.addXP`/`HQ.addCoins`
- The run is **not** logged as an activity (so the user can't just lose-and-grind XP for nothing)

## 4. Visual Design (Top-Down)

The game canvas is a fixed 480x600 box (matches the app's max-width). Inside:

```
+-----------------------------------+
|  distance: 0 / 1000 m             |  HUD top
|  stamina: [====      ]            |
|  time:    00:00                   |
+-----------------------------------+
|                                   |
|         .  .  .  (houses)         |
|     ====street====                |
|              [PLAYER]   <- you    |
|       (zombie)                    |  Game area
|     ====street====                |
|         .  .  .                   |
|                                   |
+-----------------------------------+
|   [SPRINT]      [PAUSE]           |  Controls
+-----------------------------------+
```

- **Background:** a vertical street with side-row "houses" (simple coloured blocks) that scroll downward to simulate forward motion.
- **Player:** a small circle with a "runner" emoji 🏃 (or a coloured dot if emoji rendering is flaky).
- **Zombie:** a small circle with 🧟.
- **HUD:** distance / stamina / time, top of canvas.
- **No external assets** — pure DOM/CSS so it works offline. The street scrolls via CSS animation or canvas re-render.
- **Polished feel:** score popups ("+10 XP!") float up from milestone triggers; a "sprint" trail behind the player when stamina > 50; subtle screen shake on zombie contact.

## 5. Data Layer

### 5.1 New HQ helpers in `js/storage.js`

```js
HQ.RUN_TARGETS = { Bronze: 1000, Silver: 1500, Gold: 2000, Platinum: 3000, Diamond: 4000 };

HQ.getRunTargetForUser = function(userId) {
  const u = HQ.findUserById(userId);
  return HQ.RUN_TARGETS[u && u.rank] || HQ.RUN_TARGETS.Bronze;
};

HQ.awardSurvivedChaseBadge = function(userId) {
  // Appends 'survived-chase' to user.badges if not present, returns true if newly awarded
};
```

### 5.2 New badge in `HQ.BADGES`

```js
{ id: 'survived-chase', icon: '🧟', name: 'Survived the Chase',
  check: (u) => (u.runsCompleted || 0) >= 1 }
```

(Plus a `runsCompleted` counter incremented in `HQ.logActivity` when `activity.type === 'run'` and the run was marked as `chase: true`.)

### 5.3 No changes to `js/quests.js`

Existing `recordActivityForQuests` already auto-completes `walk-3k-steps`, `walk-5k-steps`, and `workouts-3` when a `Run` activity is logged. Win a 1km+ chase and these may complete too — that's intended, not a bug.

## 6. New Files

| File | Purpose |
|------|---------|
| `run.html` | The mini-game page (auth-gated, topbar, canvas, controls) |
| `js/run.js` | Game loop, state machine, rendering, controls |
| `docs/RUN_MINIGAME_SPEC.md` | This file |

No changes to `css/styles.css` beyond a small `.run-canvas` block (kept inside `run.html` as a `<style>` to keep the global CSS lean).

## 7. Out of Scope (for this iteration)

- Multiplayer / co-op chase
- Real GPS routing
- Power-ups (weapons, shields)
- Sound effects (would be nice, but adds asset weight; can come later)
- Persistent best-time leaderboard (Township leaderboard already covers social pressure)
- Story / dialogue between player and zombie

## 8. Acceptance Criteria

- [ ] `run.html` is reachable from the dashboard Quick Actions and from a new "Run" tab in the bottom nav.
- [ ] Auth-gated; logged-out user is bounced to `index.html`.
- [ ] "Start Chase" triggers a 3-second countdown, then the game loop begins.
- [ ] Distance counter and stamina bar update in real time (60 fps target).
- [ ] Zombies visually close in on the player as the gap shrinks.
- [ ] Reaching the rank-scaled target ends the game with a "Win" screen and a confetti burst.
- [ ] A won run is logged as a `Run` activity, awarding XP/coins/streak/quest-progress/community-points exactly like a real run.
- [ ] A lost run awards milestone XP/coins but does **not** log an activity.
- [ ] The "Survived the Chase" badge is awarded on first win.
- [ ] The page is fully responsive on a 375px-wide mobile viewport.
- [ ] No console errors. Pure vanilla HTML/CSS/JS, no new dependencies.

## 9. Open Questions for You

1. **Bottom nav: which to remove?** Currently has Home, Quests, Activity, Community, Profile. Adding "Run" makes 6 items which is the practical max. I'd drop "Activity" (its content can live behind a "Log Activity" button on the run page after a win, and on the dashboard's Quick Actions) and replace with "Run". **Confirm?**
2. **Confetti** — generate with a small inline CSS animation (no library), or skip it?
3. **Sprint button behaviour** — should it be hold-to-sprint (more skill) or tap-to-toggle (more accessible)? **My default: hold-to-sprint.** Confirm.
4. **Zombie catch visual** — screen shake + red flash + slow-mo? Or just a static "Caught!" overlay? **My default: red flash + screen shake, no slow-mo.** Confirm.

Once you sign off (or correct any of the above), I implement.
