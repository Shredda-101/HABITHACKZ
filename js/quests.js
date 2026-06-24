/* HealthQuest — Quest System (v2 rewrite)

Design goals:
  1. Dailies auto-complete from real actions (activity log, med log, no manual "Complete" button).
  2. Weeklies track measurable progress (count, steps, days-medicated) and only award XP/coins
     when the user actually hits the target. No more "claim all dailies first".
  3. Badges use a pure-read path so the UI can render a locked/unlocked grid without mutating state.
  4. One source of truth: HQ.getQuestsForUser. Storage shape is backwards-compatible (id, baseId,
     type, completedDates[]) plus a new optional `progress`/`target` pair for weekly progress.

Data model
==========
Quest object in localStorage under HQ.KEYS.QUESTS[userId][]:
  {
    id:           string  // unique per (user, baseId, period). e.g. "walk-3k-2026-06-20"
    baseId:       string  // matches HQ.QUEST_TEMPLATES.daily/weekly[*].id
    type:         "daily" | "weekly"
    icon:         string
    title:        string
    xp:           number
    coins:        number
    createdDate:  string  // "YYYY-MM-DD" for daily, "YYYY-Www" for weekly
    completedDates: string[]  // daily: ["YYYY-MM-DD", ...]; weekly: ["YYYY-Www"] when claimed
    progress?:    number  // weekly progress quests only
    target?:      number  // weekly progress quests only
  }
*/

HQ.QUEST_TEMPLATES = {
  daily: [
    {
      id: 'walk-3k-steps', icon: '🚶', title: 'Walk 3,000 steps',
      xp: 30, coins: 5,
      defaultFor: ['walking', 'lose-weight'],
      activityTypes: ['walk', 'run'],
      metric: 'steps', targetMetric: 3000,
    },
    {
      id: 'walk-5k-steps', icon: '🚶', title: 'Walk 5,000 steps',
      xp: 50, coins: 8,
      defaultFor: ['walking'],
      healthy: true,
      activityTypes: ['walk', 'run'],
      metric: 'steps', targetMetric: 5000,
    },
    {
      id: 'water-2l', icon: '💧', title: 'Drink 2L of water',
      xp: 25, coins: 5,
      defaultFor: ['manage-diabetes', 'eat-better'],
      activityTypes: ['water'],
      metric: 'litres', targetMetric: 2,
    },
    {
      id: 'water-3l', icon: '💧', title: 'Drink 3L of water',
      xp: 35, coins: 7,
      defaultFor: ['manage-diabetes'],
      healthy: true,
      activityTypes: ['water'],
      metric: 'litres', targetMetric: 3,
    },
    {
      id: 'healthy-meal', icon: '🥗', title: 'Eat a healthy meal',
      xp: 30, coins: 5,
      defaultFor: ['eat-better', 'lose-weight', 'manage-diabetes'],
      activityTypes: ['meal'],
      metric: 'count', targetMetric: 1,
    },
    {
      id: 'no-sugar', icon: '🚫', title: 'Skip sugary drinks',
      xp: 25, coins: 5,
      defaultFor: ['manage-diabetes', 'lower-bp'],
      activityTypes: [],
      metric: 'manual',  // toggled elsewhere
    },
    {
      id: 'meditation-10', icon: '🧘', title: 'Meditate for 10 minutes',
      xp: 25, coins: 4,
      defaultFor: ['reduce-stress', 'sleep-better'],
      activityTypes: ['meditation'],
      metric: 'minutes', targetMetric: 10,
    },
    {
      id: 'sleep-7', icon: '😴', title: 'Sleep 7+ hours',
      xp: 30, coins: 5,
      defaultFor: ['sleep-better', 'reduce-stress'],
      activityTypes: ['sleep'],
      metric: 'hours', targetMetric: 7,
    },
    {
      id: 'no-smoke', icon: '🚭', title: 'Stay smoke-free',
      xp: 35, coins: 6,
      defaultFor: ['quit-smoking'],
      healthy: true,
      activityTypes: [],
      metric: 'manual',
    },
    {
      id: 'log-activity', icon: '📝', title: 'Log an activity',
      xp: 20, coins: 4,
      defaultFor: ['build-muscle'],
      healthy: true,
      activityTypes: ['walk', 'run', 'soccer', 'gym', 'cycling', 'yoga', 'dancing', 'swimming'],
      metric: 'count', targetMetric: 1,
    },
    {
      id: 'medication-taken', icon: '💊', title: 'Take your medication',
      xp: 20, coins: 4,
      defaultFor: ['manage-diabetes', 'lower-bp'],
      activityTypes: ['medication'],
      metric: 'count', targetMetric: 1,
    },
  ],
  weekly: [
    {
      id: 'complete-5-quests', icon: '✅', title: 'Complete 5 quests this week',
      xp: 150, coins: 25, defaultFor: [], healthy: true,
      metric: 'quests-completed', targetMetric: 5,
    },
    {
      id: 'log-3-activities', icon: '📊', title: 'Log 3 activities this week',
      xp: 120, coins: 20, defaultFor: [], healthy: true,
      metric: 'activities-logged', targetMetric: 3,
    },
    {
      id: 'walk-50k-steps', icon: '🎯', title: 'Walk 50,000 steps this week',
      xp: 200, coins: 30, defaultFor: ['walking', 'lose-weight'],
      metric: 'weekly-steps', targetMetric: 50000,
    },
    {
      id: 'workouts-3', icon: '💪', title: 'Complete 3 workouts this week',
      xp: 150, coins: 25, defaultFor: ['build-muscle', 'gym'],
      metric: 'workouts', targetMetric: 3,
    },
    {
      id: 'community-post', icon: '📣', title: 'Share a post in the feed',
      xp: 50, coins: 10, defaultFor: [], healthy: true,
      metric: 'posts-made', targetMetric: 1,
    },
    {
      id: 'join-event', icon: '📅', title: 'Join a community event',
      xp: 80, coins: 15, defaultFor: [], healthy: true,
      metric: 'events-joined', targetMetric: 1,
    },
    {
      id: 'medication-full-week', icon: '💊', title: 'Take medication 7 days in a row',
      xp: 120, coins: 20, defaultFor: ['manage-diabetes', 'lower-bp'],
      metric: 'med-days', targetMetric: 7,
    },
  ],
};

/* ---------- Period keys ---------- */

// Note: HQ.todayKey() and HQ.weekKey() live in storage.js (canonical).
// They must stay there because logActivity/logMedication/joinEvent depend on
// todayKey, and those pages do not load quests.js. Keeping them in quests.js
// alone would break the activity-logging path.

/* ---------- Quest storage ---------- */

HQ.getQuestsForUser = function(userId) {
  const all = JSON.parse(localStorage.getItem(HQ.KEYS.QUESTS) || '{}');
  return (all[String(userId)] || []).slice();
};

HQ.saveQuestsForUser = function(userId, quests) {
  const all = JSON.parse(localStorage.getItem(HQ.KEYS.QUESTS) || '{}');
  all[String(userId)] = quests;
  localStorage.setItem(HQ.KEYS.QUESTS, JSON.stringify(all));
};

/* ---------- Refresh / generate quests for the user ---------- */

HQ.refreshQuestsForUser = function(userId) {
  const user = HQ.findUserById(userId);
  if (!user) return [];

  const today = HQ.todayKey();
  const week = HQ.weekKey();
  let quests = HQ.getQuestsForUser(userId);
  const existingById = new Map(quests.map(q => [q.id, q]));

  const matchSet = new Set([...(user.goals || []), ...(user.interests || [])]);

  // ---- DAILY QUEST POOL ----
  // Pick 3 dailies. Dedup by baseId so a user who matches multiple templates
  // (e.g. both walk-3k-steps and walk-5k-steps for 'walking') doesn't see two
  // walking quests. Priority: matched (one-per-baseId) -> healthy -> fallback.
  const seenBaseIds = new Set();
  const dailyMatched = [];
  HQ.QUEST_TEMPLATES.daily.forEach(t => {
    if ((t.defaultFor || []).some(g => matchSet.has(g)) && !seenBaseIds.has(t.id)) {
      dailyMatched.push(t);
      seenBaseIds.add(t.id);
    }
  });
  const healthy = HQ.QUEST_TEMPLATES.daily.filter(t => t.healthy && !seenBaseIds.has(t.id));
  healthy.forEach(t => seenBaseIds.add(t.id));
  const dailyFallback = HQ.QUEST_TEMPLATES.daily.filter(t => !seenBaseIds.has(t.id));
  const selectedDaily = [...dailyMatched, ...healthy, ...dailyFallback].slice(0, 3);

  selectedDaily.forEach(t => {
    const id = `${t.id}-${today}`;
    if (existingById.has(id)) return;
    quests.push({
      id, baseId: t.id, type: 'daily',
      icon: t.icon, title: t.title, xp: t.xp, coins: t.coins,
      createdDate: today,
      completedDates: [],
    });
  });

  // ---- WEEKLY QUEST POOL ----
  // Always 3 per week. Selection order:
  //   1. Templates that match the user's goals/interests
  //   2. "Healthy lifestyle" templates (no defaultFor)
  //   3. Fill from anything remaining
  // We rotate within each tier using a stable hash of the week key, so the
  // same user sees the same weekly mix within a week but different weeklies
  // week-to-week.
  function stableShuffle(arr, seedStr) {
    if (arr.length < 2) return arr.slice();
    // Mulberry32 PRNG keyed by the seed string so it's deterministic per week.
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    function rand() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    }
    return arr.slice().sort((a, b) => rand() - 0.5);
  }
  const matchedWeeklySet = new Set();
  const weeklyMatched = [];
  HQ.QUEST_TEMPLATES.weekly.forEach(t => {
    if ((t.defaultFor || []).some(g => matchSet.has(g))) {
      weeklyMatched.push(t);
      matchedWeeklySet.add(t.id);
    }
  });
  const healthyWeekly = HQ.QUEST_TEMPLATES.weekly.filter(t =>
    t.healthy && !matchedWeeklySet.has(t.id)
  );
  const weeklyFallback = HQ.QUEST_TEMPLATES.weekly.filter(t =>
    !matchedWeeklySet.has(t.id) && !healthyWeekly.includes(t)
  );
  const selectedWeekly = [
    ...stableShuffle(weeklyMatched, week),
    ...stableShuffle(healthyWeekly, week),
    ...stableShuffle(weeklyFallback, week),
  ].slice(0, 4);

  selectedWeekly.forEach(t => {
    const id = `${t.id}-${week}`;
    if (existingById.has(id)) {
      // Make sure target is in sync with the template (in case of schema change).
      const ex = existingById.get(id);
      if (ex.target == null) ex.target = t.targetMetric;
      return;
    }
    quests.push({
      id, baseId: t.id, type: 'weekly',
      icon: t.icon, title: t.title, xp: t.xp, coins: t.coins,
      createdDate: week,
      completedDates: [],
      progress: 0,
      target: t.targetMetric,
    });
  });

  // ---- Cleanup: drop quests older than 14 days ----
  const cutoff = Date.now() - 14 * 86400000;
  quests = quests.filter(q => {
    if (!q.createdDate) return true;
    const ts = Date.parse(q.createdDate);
    return isNaN(ts) || ts >= cutoff;
  });

  HQ.saveQuestsForUser(userId, quests);
  return quests;
};

/* ---------- Auto-completion engine ---------- */

// Map of activity.type -> quest.activityTypes (so a 'walk' activity can satisfy a 'walk' or 'run' quest)
const ACTIVITY_TYPE_ALIASES = {
  walk: ['walk'],
  run: ['run'],
  soccer: ['soccer'],
  gym: ['gym'],
  cycling: ['cycling'],
  yoga: ['yoga'],
  dancing: ['dancing'],
  swimming: ['swimming'],
  meditation: ['meditation'],
  sleep: ['sleep'],
  meal: ['meal'],
  water: ['water'],
  medication: ['medication'],
};

function templateFor(quest) {
  const bag = HQ.QUEST_TEMPLATES[quest.type === 'weekly' ? 'weekly' : 'daily'];
  return bag.find(t => t.id === quest.baseId) || null;
}

// Returns true if the activity can satisfy the quest's activityTypes filter.
function activityMatches(questTpl, activity) {
  if (!questTpl.activityTypes || questTpl.activityTypes.length === 0) return false;
  const aliases = ACTIVITY_TYPE_ALIASES[activity.type] || [activity.type];
  return questTpl.activityTypes.some(at => aliases.includes(at));
}

// Daily auto-completion. Returns the quest object that was completed (if any).
HQ.recordActivityForQuests = function(userId, activity) {
  const user = HQ.findUserById(userId);
  if (!user) return null;
  const today = HQ.todayKey();
  const quests = HQ.getQuestsForUser(userId);
  const week = HQ.weekKey();
  let weeklyCompleted = null;
  let dailyCompleted = null;

  // ---- DAILY: mark complete if activity matches today's daily quest AND threshold met
  const dailies = quests.filter(q => q.type === 'daily');
  for (const q of dailies) {
    if (q.completedDates && q.completedDates.includes(today)) continue;
    const tpl = templateFor(q);
    if (!tpl) continue;
    if (!activityMatches(tpl, activity)) continue;

    let ok = true;
    if (tpl.metric === 'count') ok = true;
    else if (tpl.metric === 'steps') ok = (activity.steps || 0) >= tpl.targetMetric || (activity.distance || 0) >= tpl.targetMetric / 1312;
    else if (tpl.metric === 'minutes') ok = (activity.duration || 0) >= tpl.targetMetric;
    else if (tpl.metric === 'hours') ok = (activity.duration || 0) >= tpl.targetMetric * 60;
    else if (tpl.metric === 'litres') ok = (activity.amount || activity.volume || 0) >= tpl.targetMetric;
    else if (tpl.metric === 'manual') ok = true;
    if (!ok) continue;

    q.completedDates = q.completedDates || [];
    q.completedDates.push(today);
    dailyCompleted = q;
  }

  // ---- WEEKLY: bump progress, auto-complete if target hit
  const weeklies = quests.filter(q => q.type === 'weekly');
  for (const q of weeklies) {
    if (q.completedDates && q.completedDates.includes(week)) continue;
    const tpl = templateFor(q);
    if (!tpl) continue;

    let delta = 0;
    if (tpl.metric === 'activities-logged') delta = 1;
    else if (tpl.metric === 'workouts' && ['soccer', 'gym', 'run'].includes(activity.type)) delta = 1;
    else if (tpl.metric === 'weekly-steps' && (activity.type === 'walk' || activity.type === 'run')) {
      delta = Math.round((activity.distance || 0) * 1312);
    } else if (tpl.metric === 'quests-completed' && dailyCompleted && dailyCompleted.id === q.id) {
      // No-op here, counted by HQ.recordQuestCompletion
    }
    if (delta > 0) {
      q.progress = (q.progress || 0) + delta;
      if (q.target && q.progress >= q.target) {
        q.completedDates = q.completedDates || [];
        q.completedDates.push(week);
        weeklyCompleted = weeklyCompleted || q;
      }
    }
  }

  HQ.saveQuestsForUser(userId, quests);
  return { dailyCompleted, weeklyCompleted };
};

// Called whenever a daily OR weekly quest completes via any path.
HQ.recordQuestCompletion = function(userId) {
  const quests = HQ.getQuestsForUser(userId);
  const week = HQ.weekKey();
  let bumpedAny = false;
  quests.forEach(q => {
    if (q.type !== 'weekly') return;
    if (q.completedDates && q.completedDates.includes(week)) return;
    const tpl = templateFor(q);
    if (!tpl) return;
    if (tpl.metric === 'quests-completed') {
      q.progress = (q.progress || 0) + 1;
      bumpedAny = true;
      if (q.target && q.progress >= q.target) {
        q.completedDates = q.completedDates || [];
        q.completedDates.push(week);
      }
    }
  });
  if (bumpedAny) HQ.saveQuestsForUser(userId, quests);
};

// Medication-specific weekly counter (med-days, requires 7 distinct days in the week).
HQ.recordMedicationForQuests = function(userId) {
  const quests = HQ.getQuestsForUser(userId);
  const week = HQ.weekKey();
  const today = HQ.todayKey();
  // We need to count distinct days medication was logged this week.
  // Use HQ.getMedicationLogs as the source of truth.
  const logs = (HQ.getMedicationLogs && HQ.getMedicationLogs(userId)) || [];
  const days = new Set(
    logs
      .map(l => new Date(l.takenAt).toISOString().slice(0, 10))
      .filter(d => HQ.weekKey(new Date(d)) === week)
  );
  // Today is implicitly logged (because we're called from the log handler).
  days.add(today);

  let saved = false;
  quests.forEach(q => {
    if (q.type !== 'weekly' || q.baseId !== 'medication-full-week') return;
    if (q.completedDates && q.completedDates.includes(week)) return;
    q.progress = days.size;
    if (q.progress >= 7) {
      q.completedDates = q.completedDates || [];
      q.completedDates.push(week);
    }
    saved = true;
  });
  if (saved) HQ.saveQuestsForUser(userId, quests);
};

// Generic weekly counter bump: increments the progress on whichever weekly quest
// has the given baseId (e.g. 'join-event'). Returns the quest that JUST completed
// (if any) so the caller can award rewards. Returns null otherwise.
HQ.bumpWeeklyProgress = function(userId, baseId, delta) {
  const quests = HQ.getQuestsForUser(userId);
  const week = HQ.weekKey();
  let completedQuest = null;
  quests.forEach(q => {
    if (q.type !== 'weekly' || q.baseId !== baseId) return;
    if (q.completedDates && q.completedDates.includes(week)) return;
    q.progress = (q.progress || 0) + delta;
    if (q.target && q.progress >= q.target) {
      q.completedDates = q.completedDates || [];
      q.completedDates.push(week);
      completedQuest = q;
    }
  });
  if (completedQuest || delta > 0) HQ.saveQuestsForUser(userId, quests);
  return completedQuest;
};

// Award XP/coins for a quest that just completed. Returns { xp, coins, dailyQuest, weeklyQuest }.
HQ.awardQuestRewards = function(userId, quest) {
  if (!quest) return;
  const user = HQ.getUser(userId);
  HQ.addXP(userId, quest.xp);
  HQ.addCoins(userId, quest.coins);
  HQ.updateStreak(userId);
  if (user) {
    user.completedQuests = (user.completedQuests || 0) + 1;
    HQ.updateUser(userId, { completedQuests: user.completedQuests });
  }
  if (typeof HQ.checkBadgeUnlocks === 'function') HQ.checkBadgeUnlocks(HQ.getUser(userId));
  HQ.recordQuestCompletion(userId);
  HQ.toast(`+${quest.xp} XP, +${quest.coins} coins! 🎉`);
};

// Hook into the data layer: when an action triggers a quest completion, award it.
// Call this from any handler that mutates the world.
HQ.completeQuest = function(userId, questId) {
  const user = HQ.getUser(userId);
  if (!user) return { ok: false, error: 'User not found' };
  const quests = HQ.getQuestsForUser(userId);
  const quest = quests.find(q => q.id === questId);
  if (!quest) return { ok: false, error: 'Quest not found' };
  const periodKey = quest.type === 'daily' ? HQ.todayKey() : HQ.weekKey();
  if (quest.completedDates && quest.completedDates.includes(periodKey)) {
    return { ok: false, error: 'Already completed for this period' };
  }
  quest.completedDates = quest.completedDates || [];
  quest.completedDates.push(periodKey);
  HQ.saveQuestsForUser(userId, quests);
  HQ.awardQuestRewards(userId, quest);
  return { ok: true };
};

// Backwards-compatible alias for callers that still use the old name.
HQ.completeQuestForUser = function(userId, questId) {
  return HQ.completeQuest(userId, questId);
};

/* ---------- Badge engine (pure read + side-effect) ---------- */

HQ.evaluateBadges = function(user) {
  if (!user) return [];
  const owned = new Set(user.badges || []);
  return HQ.BADGES
    .filter(b => b.check(user))
    .map(b => ({ id: b.id, name: b.name, icon: b.icon, owned: owned.has(b.id) }));
};

HQ.unlockBadges = function(user) {
  if (!user) return [];
  user.badges = user.badges || [];
  const newly = [];
  HQ.BADGES.forEach(b => {
    if (!user.badges.includes(b.id) && b.check(user)) {
      user.badges.push(b.id);
      newly.push(b);
      HQ.toast(`🏅 Badge unlocked: ${b.name}`);
    }
  });
  if (newly.length) HQ.updateUser(user.id, { badges: user.badges });
  return newly;
};

// Old name kept as a thin wrapper that only does the side-effect (used in activity/med flows).
HQ.checkBadgeUnlocks = function(user) {
  if (!user) return [];
  HQ.unlockBadges(user);
  return user.badges || [];
};

/* ---------- Backwards-compat helpers ---------- */

// Some HTML still calls HQ.regenerateQuests; keep it as an alias.
HQ.regenerateQuests = function(userId) { return HQ.refreshQuestsForUser(userId); };
