# HABITHACKZ — Developer Handoff

This file is the starting point for anyone continuing the HealthQuest work.

## What this repo is

HealthQuest is a static, browser-first gamified township health app. It currently uses `localStorage` as its data layer and is split into one HTML page per major feature.

## Read first

1. `README.md` — product overview, features, and smoke-test status.
2. `HealthQuest_App_SAD_Plan.md` — the SAD / iteration plan and functional scope.
3. `js/storage.js` — core data model, persistence, rewards, community logic, and user flows.
4. `js/quests.js` — quest templates, quest generation, completion, and badge engine.
5. `js/ui.js` — shared page shell helpers.

## Page map

- `index.html` — login
- `register.html` — registration
- `goals.html` — goal and interest setup
- `dashboard.html` — landing dashboard
- `quests.html` — daily/weekly quests and badges
- `activity.html` — activity logging
- `run.html` — activity logging
- `medication.html` — medication tracking and proof
- `community.html` — township leaderboard, challenges, and feed
- `events.html` — event discovery, save, and join
- `profile.html` — profile editing and stats

## Current implementation notes

- The app is intentionally static; no backend exists yet.
- Quest generation is driven by `user.goals` and `user.interests`.
- Community ranking uses township points stored in `localStorage`.
- Notifications are optional; reminder support depends on browser permission.
- The UI is mobile-first, but the app still needs a true production backend.

## MVP path for the next developer

If the goal is a fully functional MVP, work in this order:

1. **Stabilise the data model**
   - Keep user fields consistent across pages.
   - Avoid duplicate sources of truth for points, badges, and quests.

2. **Extract shared layout and state handling**
   - Reduce repeated page boilerplate.
   - Centralise auth checks, page shell, and small UI fragments.

3. **Replace `localStorage` with a real persistence layer**
   - Users, quests, activities, medication logs, posts, and events should live on the server.
   - Add API endpoints for create/read/update flows.

4. **Add proper validation and error handling**
   - Registration, profile edits, medication logging, and event actions should fail gracefully.

5. **Add tests**
   - At minimum: quest completion, streak updates, medication logging, community ranking, and profile editing.

6. **Harden the UX**
   - Better loading states, empty states, and success/error feedback.
   - Make the notification/reminder path explicit.

## Known things to watch

- `localStorage` makes the current app easy to demo, but it is not enough for a real MVP.
- Do not introduce a second data model unless you also remove the old one.
- If you change a field name in one page, search the whole repo before shipping it.
- `activity.html`, `medication.html`, and `events.html` should stay runnable without loading extra quest logic.

## Recommended working rule

Before changing behaviour, read the relevant page file plus `js/storage.js` and `js/quests.js`. Most bugs in this repo come from silent data-shape drift, not from the UI itself.
