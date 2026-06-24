/* HealthQuest — Shared UI helpers */
function renderTopbar(title, user) {
  const streak = HQ.getStreak(user.id);
  return `
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-avatar">${renderProfilePhoto(user, 32)}</div>
        <h1>${title}</h1>
      </div>
      <div class="streak-badge" title="Daily streak">🔥 ${streak.count}</div>
    </div>
  `;
}

function renderBottomNav(active) {
  const items = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'quests', icon: '🎯', label: 'Quests' },
    { id: 'activity', icon: '🏃', label: 'Activity' },
    { id: 'community', icon: '👥', label: 'Community' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(i => `
        <a href="${i.id}.html" class="nav-item ${i.id === active ? 'active' : ''}">
          <div class="nav-icon">${i.icon}</div>
          <div>${i.label}</div>
        </a>
      `).join('')}
    </nav>
  `;
}

function renderProfilePhoto(user, size) {
  size = size || 80;
  if (user.profilePhoto) return `<div class="profile-photo" style="width:${size}px;height:${size}px;font-size:${size/2.5}px"><img src="${user.profilePhoto}" alt=""></div>`;
  return `<div class="profile-photo" style="width:${size}px;height:${size}px;font-size:${size/2.5}px">${(user.fullName || user.username || '?')[0].toUpperCase()}</div>`;
}

function renderRankBadge(rank) {
  return `<span class="rank-badge ${HQ.rankClass(rank)}">${rank}</span>`;
}

function getPageParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
