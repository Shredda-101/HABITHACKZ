# 🌿 HealthQuest — A Gamified Township Health & Fitness App

HealthQuest is a mobile-first web app that turns healthy living into a quest. .

> ✨ *"Your town. Your health. Your quest."*

---

## 🚀 Quick Start

1. Open `index.html` in a modern browser.
2. Create an account.
3. Set your goals and interests.
4. Use the dashboard, quests, activity, medication, community, events, and profile pages to test the flows.
5. Explore the app's features and test the flows.

No build step. No server. No install. Data currently persists in `localStorage`.

---

## ✅ Current Status

This repo now has a working static MVP slice with:

- registration and login
- goal and interest setup
- quest generation and completion
- XP, coins, streaks, ranks, and badges
- activity logging
- medication tracking with photo proof
- township rankings and feed posts
- event saving and joining
- profile editing and photo upload
- community feed posts and likes
- **Zombie Chase run game** (`run.html`) — to

---

## 🧭 Best Starting Point for the Next Developer

Read these files in this order:

1. `AGENTS.md` — handoff and MVP path
2. `README.md` — high-level product summary
3. `HealthQuest_App_SAD_Plan.md` — project scope and iteration plan
4. `js/storage.js` — data model and persistence layer
5. `js/quests.js` — quest engine
6. `js/ui.js` — shared UI helpers

If you are continuing development, start with the MVP path in `AGENTS.md`.

---

## 🎮 Core Features

| # | Feature | Pages |
|---|---------|-------|
| 1 | User accounts | `index.html`, `register.html`, `profile.html` |
| 2 | Goal setup | `goals.html` |
| 3 | Quest system | `quests.html` |
| 4 | Reward system | `dashboard.html`, `profile.html` |
| 5 | Streak system | All pages via the topbar |
| 6 | Dashboard | `dashboard.html` |
| 7 | Activity logging | `activity.html` |
| 8 | Medication tracking | `medication.html` |
| 9 | Community challenges | `community.html` |
| 10 | Events discovery | `events.html` |
| 11 | Community feed | `community.html` |

---

## 🏗️ Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Presentation | `*.html` | One page per major feature |
| Style | `css/styles.css` | Shared design system |
| Storage | `js/storage.js` | Users, sessions, activities, meds, community, events |
| Quests | `js/quests.js` | Quest generation, completion, rewards, badges |
| UI | `js/ui.js` | Shared page shell helpers |

---

## 🔎 Development Notes

- `user.goals` and `user.interests` are the canonical fields used by quest generation.
- Community ranking reads township points from local storage.
- Notification reminders depend on browser permission.
- The app is still a static demo. For a real MVP, the next step is a backend and proper database.

---

## 📜 License

See `LICENSE`.
