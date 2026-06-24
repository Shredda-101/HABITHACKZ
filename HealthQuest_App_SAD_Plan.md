# HealthQuest — SAD Project Plan (Iterative Approach)

> **Working title:** *HealthQuest — A Gamified Township Health & Fitness Companion*
****Module:** MCOA021 — Systems Analysis and Design
****Approach:** Iterative SDLC (Day 1 → Day 6 per iteration, multiple iterations)
****Source framework:** SADCW 7e — Chapter 1 (Practical Project Overview), Chapters 2–9

---

## 1. Project Title & Brief Discussion

**HealthQuest** is a gamified mobile-first web application that motivates users in South African townships (Mamelodi, Soshanguve, Tembisa, etc.) to adopt healthier lifestyles through daily quests, streaks, XP-based rank progression, and community competition.

**Why the name?**

- *Health* — clear value proposition: better physical wellbeing, chronic-condition management (e.g. diabetes).
- *Quest* — frames every healthy action as a "mission" to complete, tied to XP/coin rewards.
- *Township focus* — leaderboards are organised by township to drive local competition and social accountability.

**Core idea (one sentence):**

> Turn health goals into game-style quests, reward consistency with XP/coins/badges, and use township-level leaderboards to keep users engaged.

---

## 2. Mapping Your 11 Core Functionalities → SAD Domain

| \# | Core Functionality | SAD Mapping (Domain Class / Use Case Cluster) |
| --- | --- | --- |
| 1 | User Accounts | Classes: `User`, `Profile`. Use cases: Register, Login, Edit Profile, Upload Photo |
| 2 | Goal Setup | Classes: `Goal`, `Interest`. Use cases: Select Health Goals, Select Interests |
| 3 | Quest System | Classes: `Quest`, `DailyQuest`, `WeeklyQuest`, `QuestCompletion`. Use cases: View Quests, Mark Quest Complete (the "heart" use case) |
| 4 | Reward System | Classes: `XPWallet`, `CoinWallet`, `Badge`, `Rank`. Use cases: Award XP, Award Coins, Award Badge, Promote Rank |
| 5 | Streak System | Classes: `Streak`. Use cases: Track Daily Streak, Reset Streak, Display Streak (🔥 always-visible) |
| 6 | Dashboard | View layer composition. Aggregates: Streak, Rank, XP, Today's Quests, Community Rank |
| 7 | Activity Logging | Classes: `ActivityLog`. Subtypes: `WalkLog`, `RunLog`, `SoccerLog`, `GymLog`. Use case: Log Activity |
| 8 | Medication Tracking | Classes: `Medication`, `MedicationReminder`, `MedicationProof`. Use cases: Add Medication, Set Reminder, Verify Dose, Upload Photo Proof |
| 9 | Community Challenges | Classes: `Township`, `Challenge`, `CommunityPoints`. Use cases: Join Challenge, View Township Leaderboard, Award Community Points |
| 10 | Activity & Event Discovery | Classes: `Event`. Use cases: Browse Events, Save Event, Join Event |
| 11 | Community Feed | Classes: `Post`, `Comment`, `Like`. Use cases: Create Post, Like Post, Comment on Post |

---

## 3. Vision Document (Why embark on this project?)

### 3.1 Problem Statement

South Africa faces a high burden of lifestyle-related diseases (diabetes, hypertension, obesity). In township communities, gym access is limited, peer support is informal, and consistent health behaviour is hard to maintain. Existing fitness apps are either:

- Too expensive / data-heavy
- Not localised (no township context, no community competition)
- Too generic (no chronic-condition support like diabetes management)

### 3.2 Vision Statement

> *"To make healthy living in South African townships feel like a game you play with your community — so that daily walks, water intake, and medication adherence become habits people actually keep."*

### 3.3 Business Benefits

| Stakeholder | Benefit |
| --- | --- |
| **End users** | Motivation via gamification, chronic-condition support, local community accountability |
| **Clinics / NGOs** | Better medication adherence data, lower NCD burden |
| **Local event organisers** | Free event discovery platform for fun runs, soccer tournaments |
| **Sponsors (future)** | Township-targeted health campaigns |

### 3.4 Success Metrics (SMART)

- ≥ 60% of registered users maintain a 7-day streak
- ≥ 40% weekly active users (WAU/MAU)
- ≥ 30% participate in at least one township challenge
- Avg. ≥ 1.5 quests completed per user per day

---

## 4. Methodology of Choice — Iterative SDLC

Following **SADCW Chapter 1** (Day 1 → Day 6 structure) and **Chapter 2** (six core processes of the SDLC), we will use the **Iterative SDLC** approach:

### 4.1 Why Iterative?

- The 11 functionalities are large; we can't build them all in one pass.
- Each iteration produces a working slice we can demo and get feedback on.
- Lower risk — defects in early iterations are fixed cheaply.
- Aligns with the textbook's Day-1-to-Day-6 example for the RMO Tradeshow system.

### 4.2 Six Core Processes (SADCW)

1. **Identify the problem / obtain approval** → Vision Document (Section 3 above)
2. **Plan and monitor the project** → WBS + Gantt (Section 7 below)
3. **Discover and understand details** → Requirements + Use Cases (Section 5)
4. **Design system components** → UML Diagrams (Section 6)
5. **Build, test, integrate** → Implementation per iteration
6. **Complete tests, deploy solution** → Final test + demo

### 4.3 Iteration Plan (5 Iterations)

| Iteration | Scope | Duration | Demo deliverable |
| --- | --- | --- | --- |
| **Iter 1 — Foundation** | CF1 (User Accounts) + CF6 (Dashboard skeleton) | 1 week | Register, login, basic dashboard |
| **Iter 2 — Quest Core** | CF2 (Goals) + CF3 (Quests) + CF4 (Rewards) | 1 week | User picks goals, sees daily quests, earns XP/coins |
| **Iter 3 — Consistency & Logging** | CF5 (Streaks) + CF7 (Activity Logging) | 4 days | Streak 🔥 visible, log walks/runs/gym |
| **Iter 4 — Health & Community** | CF8 (Medication) + CF9 (Community Challenges) | 4 days | Med reminders, township leaderboards |
| **Iter 5 — Discovery & Social** | CF10 (Events) + CF11 (Community Feed) | 4 days | Browse fun runs, post "Completed 5km 🔥" |

Each iteration follows **Day 1 → Day 6** internally:

- **Day 1:** Plan iteration, update backlog
- **Day 2:** Fact-finding for iteration scope, use cases, classes
- **Day 3:** Detailed use cases, activity diagrams, state diagrams
- **Day 4:** Database design + class diagram + screen layouts
- **Day 5:** Implementation (HTML/CSS/JS)
- **Day 6:** Testing, introspection, next-iteration planning

---

## 5. Use Cases & Object Classes (Iteration 1 sample)

### 5.1 Use Case Diagram (Iteration 1 — Foundation)

```markdown
                     +----------------------+
                     |   HealthQuest System |
                     +----------------------+
                              |
   +--------+         +-------+-------+         +--------+
   | Guest  |         |   Member      |         | System |
   | User   |         |               |         | Admin  |
   +---+----+         +-------+-------+         +---+----+
       |                      |                     |
       | Register             | Login               | Manage
       |                      |                     | Quests
       v                      v                     v
  +---------+           +----------+           +----------+
  | Register|           |  Login   |           | Manage   |
  |  (UC1)  |           |  (UC2)   |           | Catalog  |
  +---------+           +----------+           +----------+
                              |
                              v
                        +-----------+
                        |  Edit     |
                        |  Profile  |
                        |  (UC3)    |
                        +-----------+
```

### 5.2 Sample Use Case — UC2: Login

| Field | Detail |
| --- | --- |
| **Use Case ID** | UC2 |
| **Name** | Login |
| **Actor** | Guest User (becomes Member on success) |
| **Precondition** | User has a registered account; on Login page |
| **Postcondition** | Session is created; user lands on Dashboard |
| **Normal flow** | 1\. User enters username/email + password  2. System validates against User table  3. System creates session  4. System redirects to Dashboard |
| **Alternative flow 2a** | Invalid credentials → show "Invalid username or password" |
| **Alternative flow 2b** | Account locked (3 failed attempts) → show "Account locked, reset password" |

### 5.3 Sample Use Case — UC4: Mark Quest Complete (heart of app)

| Field | Detail |
| --- | --- |
| **Use Case ID** | UC4 |
| **Name** | Mark Quest Complete |
| **Actor** | Member |
| **Precondition** | User is logged in, has selected goals, today's quest is loaded |
| **Postcondition** | Quest marked complete; XP and coins awarded; streak counter updated; badge check runs |
| **Normal flow** | 1\. User taps "Mark Complete" on a quest  2. System verifies quest belongs to today and user  3. System awards XP (e.g. +50) and coins (+10)  4. System increments streak if first quest of day  5. System checks rank promotion thresholds  6. System checks badge unlock conditions  7. System shows animation: "+50 XP, +10 coins, 🔥 streak: 24" |
| **Alternative 4a** | Quest already completed today → show "Already done" |
| **Alternative 4b** | Server unreachable → queue action offline, sync on reconnect |

### 5.4 Preliminary Domain Classes (Iteration 1 + key cross-cutting)

| Class | Key Attributes | Key Methods |
| --- | --- | --- |
| **User** | userId, username, email, passwordHash, fullName, township, photoUrl, createdAt | register(), login(), editProfile(), uploadPhoto() |
| **Profile** | profileId, userId, bio, goals\[\], interests\[\], dateOfBirth, gender | updateGoals(), updateInterests() |
| **Goal** | goalId, name, category (weight/diabetes/general) | — |
| **Interest** | interestId, name, category (walking/soccer/etc.) | — |
| **Quest** | questId, title, description, xpReward, coinReward, type (daily/weekly), goalId | generateForUser(), markComplete() |
| **QuestCompletion** | completionId, questId, userId, completedAt, proofUrl | — |
| **XPWallet** | userId, totalXP, currentRank, xpToNextRank | addXP(), promoteRank() |
| **CoinWallet** | userId, totalCoins | addCoins(), spendCoins() |
| **Badge** | badgeId, name, criterion, iconUrl | — |
| **UserBadge** | userId, badgeId, earnedAt | — |
| **Rank** | rankId, name (Bronze/Silver/Gold/Platinum/Diamond), minXP | — |
| **Streak** | userId, currentDays, longestDays, lastActiveDate | incrementIfToday(), resetIfMissed() |
| **ActivityLog** | logId, userId, type (walk/run/soccer/gym), duration, distance, loggedAt | — |
| **Medication** | medId, userId, name, dosage, frequency, photoProofUrl | addMedication(), verifyDose() |
| **MedicationReminder** | reminderId, medId, timeOfDay, days\[\] | trigger() |
| **Township** | townshipId, name (Mamelodi/Soshanguve/Tembisa/...), region | — |
| **Challenge** | challengeId, name, startDate, endDate, scope (township/global) | joinChallenge(), awardPoints() |
| **CommunityPoints** | townshipId, periodMonth, totalPoints | recalculate() |
| **Event** | eventId, name, type (funrun/walk/soccer), date, location, townshipId | — |
| **EventRSVP** | userId, eventId, status (saved/joined) | — |
| **Post** | postId, userId, body, createdAt, parentPostId (for comments) | createPost(), deletePost() |
| **Like** | likeId, postId, userId, createdAt | — |

---

## 6. UML Diagrams — Roadmap

Per iteration we will produce:

| Diagram | Iteration 1 | Iter 2 | Iter 3 | Iter 4 | Iter 5 |
| --- | --- | --- | --- | --- | --- |
| **Use Case Diagram** | ✅ | + | + | + | \+ (final) |
| **Activity Diagram** | Login, Register | Mark Quest Complete | Log Activity | Med Reminder | Create Post |
| **State Machine** | User Session | Quest lifecycle | Streak lifecycle | Med adherence | Post moderation |
| **Class Diagram** | User, Profile | \+ Quest/Reward | \+ Activity | \+ Med/Township | \+ Event/Post |
| **Sequence Diagram** | Login | Mark Quest Complete | Log Activity | Med Verification | Create Post |
| **DFD (Context + Level 0)** | ✅ | — | — | — | — |
| **ERD** | ✅ (foundation) | + | + | + | ✅ (final) |

We will generate the final consolidated UML set at end of Iteration 5 for the report.

---

## 7. Project Scheduling

### 7.1 Work Breakdown Structure (WBS)

```markdown
HealthQuest SAD Project
├── 1. Project Initiation
│   ├── 1.1 Form team & assign roles
│   ├── 1.2 Finalise project title & vision
│   └── 1.3 Approval
├── 2. Iteration 1 — Foundation (User Accounts + Dashboard skeleton)
│   ├── 2.1 Requirements (use cases UC1–UC3)
│   ├── 2.2 Design (class diagram, login activity, session state)
│   ├── 2.3 Implementation (Register, Login, Dashboard skeleton)
│   └── 2.4 Test & introspect
├── 3. Iteration 2 — Quest Core (Goals + Quests + Rewards)
│   ├── 3.1 Requirements (UC4, UC5, UC6)
│   ├── 3.2 Design (Quest class, Reward subsystem)
│   ├── 3.3 Implementation (goal picker, daily quest UI, XP/coin popups)
│   └── 3.4 Test & introspect
├── 4. Iteration 3 — Consistency (Streaks + Activity Logging)
├── 5. Iteration 4 — Health & Community (Medication + Township Challenges)
├── 6. Iteration 5 — Discovery & Social (Events + Feed)
├── 7. Final Integration & Polish
│   ├── 7.1 Cross-iteration bug fixes
│   ├── 7.2 Mobile responsiveness audit
│   └── 7.3 Accessibility check
├── 8. Documentation
│   ├── 8.1 Compile SAD report
│   ├── 8.2 Build PowerPoint (SMU template)
│   └── 8.3 Prepare demo script
└── 9. Submission
    ├── 9.1 Submit PPT to Blackboard (08h00 presentation day)
    └── 9.2 Binded report + software after presentation
```

### 7.2 Gantt Chart (5 weeks)

| Phase / Iteration | Wk 1 | Wk 2 | Wk 3 | Wk 4 | Wk 5 |
| --- | --- | --- | --- | --- | --- |
| 1\. Initiation | ██ |  |  |  |  |
| 2\. Iteration 1 — Foundation | ██ | ██ |  |  |  |
| 3\. Iteration 2 — Quest Core |  | ██ | ██ |  |  |
| 4\. Iteration 3 — Streaks & Logging |  |  | ██ | ██ |  |
| 5\. Iteration 4 — Meds & Community |  |  |  | ██ | ██ |
| 6\. Iteration 5 — Events & Feed |  |  |  | ██ | ██ |
| 7\. Final Integration |  |  |  |  | ██ |
| 8\. Documentation |  |  |  | ██ | ██ |
| 9\. Submission (15 May, 08h00) |  |  |  |  | ██ |

### 7.3 Team — 5 Members (2 Technical)

| \# | Role | Member | Focus Across Iterations |
| --- | --- | --- | --- |
| 1 | **Project Manager / Lead Analyst** | (Non-tech) | WBS, Gantt, milestone tracking, requirements, use cases, problem analysis |
| 2 | **UI/UX Designer + Documentation Lead** | (Non-tech) | Wireframes, mobile-first CSS review, SAD report, PowerPoint, demo script |
| 3 | **QA / Tester + Research** | (Non-tech) | Test cases, evidence collection, stakeholder interviews, requirements gathering |
| 4 | **Lead Developer (Tech 1)** | (Technical) | Architecture, authentication, dashboard, streak system, deployment |
| 5 | **Developer (Tech 2)** | (Technical) | Quest system, rewards, activity logging, medication, community, events, feed |

**Delegation rule for 2 technical members:**

- **Tech 1** owns the *cross-cutting infrastructure* (auth, dashboard, streak, shared utilities like storage.js and rank.js). Stuff every feature depends on.
- **Tech 2** owns the *feature modules* (quests, rewards, activity logs, medication, township challenges, events, feed). They consume the utilities Tech 1 ships.
- Each iteration has a clear handoff: Tech 1 finishes infrastructure APIs first (Day 5 morning), Tech 2 then wires the feature (Day 5 afternoon).
- Both review each other's PRs to share context.

**Non-technical member responsibilities (so the tech pair aren't overloaded):**

- Member 1 (PM/Lead Analyst) keeps the schedule, drives Day 2 requirements, produces use case tables.
- Member 2 (UI/UX + Docs) produces wireframes (paper/Figma), writes the report, builds the PowerPoint — all deliverables the tech pair only need to review and screenshot.
- Member 3 (QA) writes test scripts from the use cases *before* the tech pair builds, runs tests after each iteration, captures screenshots as evidence.

This split mirrors the FoodyBudBuds project pattern but is tightened for 5 people.

### 7.4 Milestones

| Milestone | Target |
| --- | --- |
| Team formed, vision approved | Day 1 |
| Iteration 1 demo (Login + Dashboard skeleton) | End of Wk 2 |
| Iteration 2 demo (Quests + XP working) | End of Wk 3 |
| Iteration 5 complete (all 11 CFs built) | Day before presentation |
| SAD report + PPT submitted to Blackboard | **15 May, 08h00** |
| Presentation | **15 May, during practical** |

---

## 8. Tech Stack (compatible with your Year 1 HTML/CSS/JS skills)

| Layer | Technology | Rationale |
| --- | --- | --- |
| Markup | HTML5 | Year 1 skill, no new dependency |
| Styling | CSS3 (Flexbox + Grid) + mobile-first media queries | Responsive design |
| Logic | Vanilla JavaScript (ES6+) | No build step, easy to demo |
| Persistence | `localStorage` (Iter 1) → optional `IndexedDB` later | Mirrors FoodyBudBuds pattern |
| Diagrams | D2 (code-based UML) → PNG | Renders on phone, copy-paste friendly |
| Documents | Pandoc (MD → DOCX), MS PowerPoint (SMU template) | Per guidelines |
| Version control | Git + GitHub | Submission & collaboration |

---

## 9. Next Steps — How we proceed iteratively

**Today / Iteration 1 (Foundation) — proposed Day-by-Day:**

- **Day 1:** Confirm vision, lock Iteration-1 scope (CF1 + CF6 skeleton), assign roles.
- **Day 2:** Detail UC1 (Register), UC2 (Login), UC3 (Edit Profile). Identify User & Profile classes.
- **Day 3:** Draw activity diagram (Register → Login), state machine (User Session: Guest → Registered → Member).
- **Day 4:** Class diagram (User, Profile, Session), screen wireframes (Register, Login, Dashboard skeleton).
- **Day 5:** Build `file register.html`, `file login.html`, `file dashboard.html` with `localStorage` auth.
- **Day 6:** Test register/login flows, fix broken links, document any issues for Iter 2.

Once you confirm this plan, the next step is to produce the **Iteration 1 deliverable artefacts**:

1. Use case table (UC1, UC2, UC3)
2. Activity diagram (Register + Login flow)
3. State machine diagram (User Session)
4. Domain class diagram (User, Profile, Session)
5. First HTML/CSS/JS implementation of Register + Login + Dashboard skeleton

---

## 10. Open Questions for You (please confirm)

1. **Project name** — is *HealthQuest* acceptable, or do you have a preferred name?
2. **Tech stack** — confirm HTML/CSS/JS only (no React/backend), or do you want a simple backend (Node/Express) for cross-user features like township leaderboards?
3. **Iteration 1 scope** — start with **User Accounts + Dashboard skeleton** as proposed?
4. **Team size** — how many members (≤ 8 per guidelines)? I can tailor role assignments once you tell me.
5. **Submission target** — confirm the **15 May 2026** date so I align the Gantt to the remaining weeks.

Once you answer these, I'll lock the iteration plan and start producing the Iteration 1 SAD artefacts (use cases, UML, wireframes, starter code).