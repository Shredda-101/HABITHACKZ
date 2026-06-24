/* HealthQuest — Data storage layer (localStorage)

Contract notes (after debug pass):
  - addXP / addCoins / addCommunityPoints now accept (userId, amount) and
    persist via updateUser internally. Callers should pass the user id.
  - rankFromXP is the single source of truth for rank thresholds:
      Bronze:0, Silver:500, Gold:2000, Platinum:5000, Diamond:10000
    RANK_THRESHOLDS is kept in sync as [0, 500, 2000, 5000, 10000].
  - checkBadgeUnlocks returns the user's updated badges array.
  - completeQuest returns { ok, error? }.
  - getCommunityPoints accepts either a township name or a userId.
*/

const HQ = {
  KEYS: {
    USERS: 'hq_users',
    SESSION: 'hq_session',
    QUESTS: 'hq_quests',
    ACTIVITIES: 'hq_activities',
    MEDICATIONS: 'hq_medications',
    MED_LOGS: 'hq_medication_logs',
    POSTS: 'hq_posts',
    EVENTS: 'hq_events',
    SAVED_EVENTS: 'hq_saved_events',
    JOINED_EVENTS: 'hq_joined_events',
    STREAK: 'hq_streak',
    COMMUNITY_POINTS: 'hq_community_points',
    TOWNSHIPS: 'hq_townships',
    CHALLENGES: 'hq_challenges'
  },

  // Date helpers used across storage + quests
  // Note: todayKey(), weekKey(), completeQuest(), checkBadgeUnlocks()
  // live in js/quests.js. storage.js is loaded first, quests.js second, and
  // quests.js owns the canonical implementations. Don't redefine them here.

  // Canonical todayKey / weekKey — these MUST live in storage.js because
  // logActivity, logMedication, joinEvent, and other storage-level flows call
  // updateStreak (which uses todayKey), and activity.html / medication.html /
  // events.html do not load quests.js. Keeping them here avoids a hard
  // dependency on quests.js for the activity-logging path.
  todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  weekKey(d) {
    d = d || new Date();
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = (target - firstThursday) / 86400000;
    const week = 1 + Math.floor(diff / 7);
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
  },

  findUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  // Storage helpers
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : (fallback ?? null);
    } catch { return fallback ?? null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // User CRUD
  getUsers() { return this.get(this.KEYS.USERS, []); },
  saveUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.set(this.KEYS.USERS, users);
  },
  findUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserByUsername(username) {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },
  updateUser(userId, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) { users[idx] = { ...users[idx], ...updates }; this.set(this.KEYS.USERS, users); }
    return users[idx];
  },

  // Session
  getSession() { return this.get(this.KEYS.SESSION); },
  setSession(userId) { this.set(this.KEYS.SESSION, { userId, createdAt: Date.now() }); },
  clearSession() { localStorage.removeItem(this.KEYS.SESSION); },
  getCurrentUser() {
    const s = this.getSession();
    if (!s) return null;
    return this.getUsers().find(u => u.id === s.userId) || null;
  },
  requireAuth() {
    if (!this.getCurrentUser()) { window.location.href = 'index.html'; return null; }
    return this.getCurrentUser();
  },

  // Toast
  toast(msg, ms = 2200) {
    let t = document.getElementById('hq-toast');
    if (!t) { t = document.createElement('div'); t.id = 'hq-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  },

  // Format helpers
  fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  fmtRelative(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return this.fmtDate(ts);
  },

  // Rank progression — single source of truth
  RANKS: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
  // Zombie Chase run distance targets (meters), scaled by rank
  RUN_TARGETS: { Bronze: 1000, Silver: 1500, Gold: 2000, Platinum: 3000, Diamond: 4000 },
  getRunTargetForUser(userId) {
    const u = HQ.findUserById(userId);
    return HQ.RUN_TARGETS[u && u.rank] || HQ.RUN_TARGETS.Bronze;
  },
  rankFromXP(xp) {
    if (xp >= 10000) return 'Diamond';
    if (xp >= 5000) return 'Platinum';
    if (xp >= 2000) return 'Gold';
    if (xp >= 500) return 'Silver';
    return 'Bronze';
  },
  rankClass(rank) { return 'rank-' + rank.toLowerCase(); },
  nextRank(xp) {
    const cur = this.rankFromXP(xp);
    const idx = this.RANKS.indexOf(cur);
    if (idx === this.RANKS.length - 1) return null;
    return this.RANKS[idx + 1];
  },
  xpForRank(rank) {
    return { Bronze: 0, Silver: 500, Gold: 2000, Platinum: 5000, Diamond: 10000 }[rank] || 0;
  },
  xpProgressToNext(xp) {
    const cur = this.rankFromXP(xp);
    const next = this.nextRank(xp);
    if (!next) return 100;
    const curMin = this.xpForRank(cur);
    const nextMin = this.xpForRank(next);
    return Math.min(100, Math.round(((xp - curMin) / (nextMin - curMin)) * 100));
  },

  // Streak
  getStreak(userId) {
    return this.get(this.KEYS.STREAK + '_' + userId, { count: 0, lastDate: null });
  },
  setStreak(userId, streak) {
    this.set(this.KEYS.STREAK + '_' + userId, streak);
    return streak;
  },
  updateStreak(userId) {
    const user = this.findUserById(userId);
    if (!user) return null;
    const today = this.todayKey();
    const streak = this.getStreak(userId);
    if (streak.lastDate === today) return streak;
    if (streak.lastDate) {
      const last = new Date(streak.lastDate);
      const now = new Date(today);
      const diff = Math.round((now - last) / 86400000);
      streak.count = (diff === 1) ? (streak.count || 0) + 1 : 1;
    } else {
      streak.count = 1;
    }
    streak.lastDate = today;
    return this.setStreak(userId, streak);
  },

  // ID generator
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
};

// Seed sample data on first load
(function seed() {
  if (!localStorage.getItem('hq_seeded_v1')) {
    HQ.set(HQ.KEYS.TOWNSHIPS, [
      { name: 'Mamelodi', points: 1240, members: 24 },
      { name: 'Soshanguve', points: 980, members: 18 },
      { name: 'Tembisa', points: 1450, members: 31 },
      { name: 'Atteridgeville', points: 760, members: 12 },
      { name: 'Hammanskraal', points: 540, members: 9 }
    ]);
    HQ.set(HQ.KEYS.CHALLENGES, [
      { id: HQ.uid(), title: '30-Day Walking Challenge', description: 'Walk 10,000 steps daily for 30 days', township: 'All', xp: 500, coins: 200, endDate: Date.now() + 30*86400000 },
      { id: HQ.uid(), title: 'Hydration Hero', description: 'Drink 2L of water for 14 days straight', township: 'All', xp: 300, coins: 100, endDate: Date.now() + 14*86400000 },
      { id: HQ.uid(), title: 'Soccer Saturday', description: 'Play soccer 4 times this month', township: 'Mamelodi', xp: 250, coins: 80, endDate: Date.now() + 30*86400000 }
    ]);
    HQ.set(HQ.KEYS.EVENTS, [
      { id: HQ.uid(), title: 'Mamelodi Community Fun Run', date: Date.now() + 7*86400000, location: 'Mamelodi Stadium', type: 'Fun Run', description: '5km community fun run. All ages welcome.' },
      { id: HQ.uid(), title: 'Tembisa Soccer Tournament', date: Date.now() + 14*86400000, location: 'Tembisa Sports Ground', type: 'Soccer', description: 'Inter-township soccer tournament. Sign up your team.' },
      { id: HQ.uid(), title: 'Soshanguve Health Walk', date: Date.now() + 3*86400000, location: 'Soshanguve Block X', type: 'Community Walk', description: '3km walk promoting healthy living.' },
      { id: HQ.uid(), title: 'Atteridgeville Yoga in the Park', date: Date.now() + 10*86400000, location: 'AP Park', type: 'Wellness', description: 'Free community yoga session.' }
    ]);
    HQ.set(HQ.KEYS.POSTS, [
      { id: HQ.uid(), author: 'Thabo M.', township: 'Mamelodi', content: 'Completed a 5km walk today! 🔥', likes: 12, comments: [{ user: 'Lerato', text: 'Amazing! Keep it up!' }, { user: 'Sipho', text: 'Proud of you!' }], createdAt: Date.now() - 3600000 },
      { id: HQ.uid(), author: 'Nomsa K.', township: 'Tembisa', content: 'Hit my 30-day streak! 💪', likes: 28, comments: [{ user: 'Karabo', text: 'Goals!' }], createdAt: Date.now() - 7200000 },
      { id: HQ.uid(), author: 'Bongani P.', township: 'Soshanguve', content: 'Drank 2L of water every day this week 💧', likes: 9, comments: [], createdAt: Date.now() - 86400000 }
    ]);
    localStorage.setItem('hq_seeded_v1', '1');
  }
})();

HQ.RANK_THRESHOLDS = [0, 500, 2000, 5000, 10000];
HQ.BADGES = [
  { id: 'first-quest', icon: '🎯', name: 'First Quest', check: (u) => (u.completedQuests || 0) >= 1 },
  { id: 'streak-7', icon: '🔥', name: '7-Day Streak', check: (u) => HQ.getStreak(u.id).count >= 7 },
  { id: 'streak-30', icon: '💎', name: '30-Day Streak', check: (u) => HQ.getStreak(u.id).count >= 30 },
  { id: 'xp-500', icon: '⭐', name: '500 XP Earned', check: (u) => (u.xp || 0) >= 500 },
  { id: 'xp-1500', icon: '🌟', name: '1500 XP Earned', check: (u) => (u.xp || 0) >= 1500 },
  { id: 'first-activity', icon: '🏃', name: 'First Activity', check: (u) => (u.activitiesLogged || 0) >= 1 },
  { id: 'activities-10', icon: '💪', name: '10 Activities', check: (u) => (u.activitiesLogged || 0) >= 10 },
  { id: 'first-med', icon: '💊', name: 'Med Tracked', check: (u) => (u.medsTracked || 0) >= 1 },
  { id: 'first-post', icon: '📣', name: 'First Post', check: (u) => (u.postsMade || 0) >= 1 },
  { id: 'community-join', icon: '🤝', name: 'Joined Event', check: (u) => (u.eventsJoined || 0) >= 1 },
  { id: 'survived-chase', icon: '🧟', name: 'Survived the Chase', check: (u) => (u.runsCompleted || 0) >= 1 },
];

HQ.rankIcon = function(rank) {
  return { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💠', Diamond: '💎' }[rank] || '🥉';
};

HQ.addXP = function(userId, amount) {
  const user = HQ.findUserById(userId);
  if (!user) return;
  user.xp = (user.xp || 0) + amount;
  // Note: completedQuests is now incremented only by HQ.awardQuestRewards
  // (in quests.js) when a quest is actually completed, not on every XP gain.
  const newRank = HQ.rankFromXP(user.xp);
  const promoted = newRank !== user.rank;
  if (promoted) user.rank = newRank;
  HQ.updateUser(userId, { xp: user.xp, rank: user.rank });
  if (promoted) HQ.toast(`Promoted to ${newRank}!`);
  if (typeof HQ.checkBadgeUnlocks === 'function') HQ.checkBadgeUnlocks(user);
};

HQ.addCoins = function(userId, amount) {
  const user = HQ.findUserById(userId);
  if (!user) return;
  user.coins = (user.coins || 0) + amount;
  HQ.updateUser(userId, { coins: user.coins });
};

HQ.addCommunityPoints = function(userId, amount) {
  const u = HQ.findUserById(userId);
  if (!u || !u.township) return;
  const map = HQ.get(HQ.KEYS.COMMUNITY_POINTS, {});
  map[u.township] = (map[u.township] || 0) + amount;
  HQ.set(HQ.KEYS.COMMUNITY_POINTS, map);
};

HQ.getCommunityPoints = function(township) {
  const map = this.get(this.KEYS.COMMUNITY_POINTS, {});
  return map[township] || 0;
};

// Note: contribute community points via HQ.addCommunityPoints(userId, amount).

HQ.addToTownship = function(township, amount) {
  const townships = this.get(this.KEYS.TOWNSHIPS, []);
  const t = townships.find(x => x.name === township);
  if (t) {
    t.points = (t.points || 0) + amount;
    this.set(this.KEYS.TOWNSHIPS, townships);
  }
};

// Note: HQ.checkBadgeUnlocks is implemented in quests.js (canonical owner).

HQ.getTownshipRankings = function() {
  const townships = HQ.get(HQ.KEYS.TOWNSHIPS, []);
  const points = HQ.get(HQ.KEYS.COMMUNITY_POINTS, {});
  return townships
    .map(t => ({ ...t, xp: points[t.name] || t.points || 0 }))
    .sort((a, b) => b.xp - a.xp);
};

HQ.MONTHLY_CHALLENGE_TEMPLATES = [
  { id: 'walk-30', title: 'Walk 100km this month', icon: '🚶', target: 100, unit: 'km', metric: 'distance', activityTypes: ['walk','run'], xp: 500, coins: 200 },
  { id: 'water-30', title: 'Drink 2L daily for 30 days', icon: '💧', target: 30, unit: 'days', metric: 'water', xp: 300, coins: 100 },
  { id: 'soccer-4', title: 'Play soccer 4 times this month', icon: '⚽', target: 4, unit: 'games', metric: 'count', activityTypes: ['soccer'], xp: 250, coins: 80 },
  { id: 'gym-8', title: 'Hit the gym 8 times this month', icon: '🏋️', target: 8, unit: 'sessions', metric: 'count', activityTypes: ['gym'], xp: 300, coins: 120 }
];

HQ.logActivity = function(userId, activity) {
  const acts = this.get(this.KEYS.ACTIVITIES + '_' + userId, []);
  acts.push({ id: this.uid(), date: Date.now(), ...activity });
  this.set(this.KEYS.ACTIVITIES + '_' + userId, acts);
  const types = { walk: '🚶 Walk', run: '🏃 Run', soccer: '⚽ Soccer', gym: '🏋️ Gym' };
  const t = types[activity.type] || activity.type;
  const xp = this.activityXP(activity, activity.duration, activity.distance);

  // IMPORTANT: bump per-run counters (activitiesLogged, runsCompleted, etc)
  // BEFORE addXP, because addXP calls checkBadgeUnlocks and the badge
  // predicates read user.runsCompleted / user.activitiesLogged.
  const userForLog = this.getUser(userId);
  if (userForLog) {
    userForLog.activitiesLogged = (userForLog.activitiesLogged || 0) + 1;
    if (activity.chase) userForLog.runsCompleted = (userForLog.runsCompleted || 0) + 1;
    this.updateUser(userId, {
      activitiesLogged: userForLog.activitiesLogged,
      runsCompleted: userForLog.runsCompleted || 0,
    });
  }

  this.addXP(userId, xp);
  this.addCoins(userId, Math.floor(xp / 6));
  this.addCommunityPoints(userId, Math.floor(xp / 10));
  this.updateStreak(userId);
  if (typeof this.checkBadgeUnlocks === 'function') this.checkBadgeUnlocks(this.getUser(userId));

  // Auto-complete daily quests + bump weekly progress for this activity.
  if (typeof HQ.recordActivityForQuests === 'function') {
    const completed = HQ.recordActivityForQuests(userId, activity);
    if (completed && completed.dailyCompleted) HQ.awardQuestRewards(userId, completed.dailyCompleted);
    if (completed && completed.weeklyCompleted) HQ.awardQuestRewards(userId, completed.weeklyCompleted);
  }

  // Township auto-contribution: +5 points per activity logged
  if (userId) {
    const activityUser = this.getUser(userId);
    if (activityUser && activityUser.township) {
      this.addToTownship(activityUser.township, 5);
    }
  }
};

// Returns medal tier reached for a given distance. Used by the run page
// to render the result screen.
HQ.calculateRunMedals = function(distanceMeters) {
  const d = Math.max(0, Math.floor(distanceMeters || 0));
  // Tier thresholds per spec §3.5:
  //   250m  = bronze  (Tier I)
  //   1000m = silver  (Tier II)
  //   2000m = gold    (Tier III)
  //   3000m = diamond (Tier IV)
  // Return the highest tier reached.
  if (d >= 3000) return { tier: 'diamond', name: 'Diamond', icon: '💎', color: '#7DD3FC' };
  if (d >= 2000) return { tier: 'gold', name: 'Gold', icon: '🥇', color: '#FBBF24' };
  if (d >= 1000) return { tier: 'silver', name: 'Silver', icon: '🥈', color: '#D1D5DB' };
  if (d >= 250) return { tier: 'bronze', name: 'Bronze', icon: '🥉', color: '#B45309' };
  return null;
};

HQ.recordZombieChaseRun = function(userId, outcome) {
  if (!userId || !outcome) return;
  if (outcome.result === 'win') {
    // Log as a real activity so it counts toward quests, streak, township, and badges.
    this.logActivity(userId, {
      type: 'run',
      chase: true,
      duration: outcome.duration || 0,
      distance: outcome.distance || 0,
      steps: outcome.steps || 0,
    });
  } else if (outcome.result === 'caught') {
    // No activity log (the user didn't complete the run), but streak is preserved
    // because the run still counts as engagement.
    this.updateStreak(userId);
  }
};

HQ.getActivities = function(userId) {
  return this.get(this.KEYS.ACTIVITIES + '_' + userId, []);
};

HQ.activityXP = function(activity, duration, distance) {
  const id = typeof activity === 'string' ? activity : (activity && activity.id);
  const dur = duration || 0;
  const dist = distance || 0;
  if (id === 'run') return Math.max(10, Math.round(dur * 1.5 + dist * 8));
  if (id === 'soccer') return Math.max(15, Math.round(dur * 1.2));
  if (id === 'gym') return Math.max(10, Math.round(dur * 1.0));
  return Math.max(8, Math.round(dur * 0.8 + dist * 6));
};

HQ.addMedication = function(userId, med) {
  const meds = this.getMedications(userId);
  meds.push({ id: this.uid(), addedAt: Date.now(), ...med });
  this.set(this.KEYS.MEDICATIONS + '_' + userId, meds);
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  this.setReminder(userId, med);
};

HQ.getMedications = function(userId) {
  return this.get(this.KEYS.MEDICATIONS + '_' + userId, []);
};

HQ.removeMedication = function(userId, medId) {
  const meds = this.getMedications(userId).filter(m => m.id !== medId);
  this.set(this.KEYS.MEDICATIONS + '_' + userId, meds);
};

HQ.logMedication = function(userId, medId, photoProof) {
  const logs = this.get(this.KEYS.MED_LOGS + '_' + userId, []);
  const meds = this.getMedications(userId);
  const med = meds.find(m => m.id === medId);
  logs.push({ id: this.uid(), medicationId: medId, name: med?.name, dose: med?.dose, takenAt: Date.now(), photoProof: photoProof || null });
  this.set(this.KEYS.MED_LOGS + '_' + userId, logs);
  const medUser = this.getUser(userId);
  if (medUser) {
    medUser.medsTracked = (medUser.medsTracked || 0) + 1;
    this.updateUser(userId, { medsTracked: medUser.medsTracked });
  }
  this.addXP(userId, 15);
  this.addCoins(userId, 3);
  this.updateStreak(userId);
  if (typeof this.checkBadgeUnlocks === 'function') this.checkBadgeUnlocks(this.getUser(userId));

  // Auto-complete daily "medication-taken" quest + bump weekly med-day counter.
  if (typeof HQ.recordActivityForQuests === 'function') {
    const c = HQ.recordActivityForQuests(userId, { type: 'medication' });
    if (c && c.dailyCompleted) HQ.awardQuestRewards(userId, c.dailyCompleted);
  }
  if (typeof HQ.recordMedicationForQuests === 'function') {
    HQ.recordMedicationForQuests(userId);
    const quests = HQ.getQuestsForUser(userId) || [];
    const week = HQ.weekKey();
    const medWeek = quests.find(q => q.baseId === 'medication-full-week' && (!q.completedDates || !q.completedDates.includes(week)));
    if (medWeek && medWeek.completedDates && medWeek.completedDates.includes(week)) {
      HQ.awardQuestRewards(userId, medWeek);
    }
  }
};

HQ.getMedicationLogs = function(userId) {
  return this.get(this.KEYS.MED_LOGS + '_' + userId, []);
};

HQ.setReminder = function(userId, med) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    const [h, m] = (med.time || '08:00').split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next - now;
    setTimeout(() => {
      new Notification('💊 HealthQuest Reminder', { body: `Time to take ${med.name} ${med.dose || ''}` });
    }, delay);
  }
};

HQ.requestNotificationPermission = function() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

HQ.getCurrentMonthlyChallenges = function() {
  const all = this.get(this.KEYS.CHALLENGES, []);
  return all.filter(c => !c.endDate || c.endDate > Date.now());
};

HQ.getPosts = function() { return this.get(this.KEYS.POSTS, []); };
HQ.addPost = function(author, township, content, userId) {
  const posts = this.getPosts();
  posts.push({ id: this.uid(), author, township, content, likes: 0, comments: [], createdAt: Date.now() });
  this.set(this.KEYS.POSTS, posts);
  if (userId) {
    const u = this.getUser(userId);
    if (u) {
      u.postsMade = (u.postsMade || 0) + 1;
      this.updateUser(userId, { postsMade: u.postsMade });
    }
  }
};
HQ.likePost = function(postId) {
  const posts = this.getPosts();
  const p = posts.find(x => x.id === postId);
  if (p) { p.likes++; this.set(this.KEYS.POSTS, posts); }
};
HQ.addComment = function(postId, user, text) {
  const posts = this.getPosts();
  const p = posts.find(x => x.id === postId);
  if (p) { p.comments.push({ user, text }); this.set(this.KEYS.POSTS, posts); }
};

HQ.getEvents = function() { return this.get(this.KEYS.EVENTS, []); };
HQ.saveEvent = function(userId, eventId) {
  const list = this.get(this.KEYS.SAVED_EVENTS + '_' + userId, []);
  if (!list.includes(eventId)) list.push(eventId);
  this.set(this.KEYS.SAVED_EVENTS + '_' + userId, list);
};
HQ.unsaveEvent = function(userId, eventId) {
  const list = this.get(this.KEYS.SAVED_EVENTS + '_' + userId, []).filter(id => id !== eventId);
  this.set(this.KEYS.SAVED_EVENTS + '_' + userId, list);
};
HQ.joinEvent = function(userId, eventId) {
  const list = this.get(this.KEYS.JOINED_EVENTS + '_' + userId, []);
  if (list.includes(eventId)) return;
  list.push(eventId);
  this.set(this.KEYS.JOINED_EVENTS + '_' + userId, list);
  const eu = this.getUser(userId);
  if (eu) {
    eu.eventsJoined = (eu.eventsJoined || 0) + 1;
    this.updateUser(userId, { eventsJoined: eu.eventsJoined });
  }
  this.addXP(userId, 50);
  this.addCoins(userId, 15);
  if (typeof this.checkBadgeUnlocks === 'function') this.checkBadgeUnlocks(eu);
  if (typeof HQ.bumpWeeklyProgress === 'function') {
    const c = HQ.bumpWeeklyProgress(userId, 'join-event', 1);
    if (c) HQ.awardQuestRewards(userId, c);
  }
};
HQ.getSavedEvents = function(userId) {
  const ids = this.get(this.KEYS.SAVED_EVENTS + '_' + userId, []);
  return this.getEvents().filter(e => ids.includes(e.id));
};
HQ.getJoinedEvents = function(userId) {
  const ids = this.get(this.KEYS.JOINED_EVENTS + '_' + userId, []);
  return this.getEvents().filter(e => ids.includes(e.id));
};
HQ.isEventSaved = function(userId, eventId) {
  return this.get(this.KEYS.SAVED_EVENTS + '_' + userId, []).includes(eventId);
};
HQ.isEventJoined = function(userId, eventId) {
  return this.get(this.KEYS.JOINED_EVENTS + '_' + userId, []).includes(eventId);
};

HQ.getUser = function(id) {
  return this.getUsers().find(u => u.id === id) || null;
};

HQ.getUserByUsername = function(username) {
  return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
};

HQ.editProfile = function(userId, updates) {
  return this.updateUser(userId, updates);
};