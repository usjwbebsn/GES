// ═══════════════════════════════
// EY — feed.js
// Live event feed (right sidebar)
// ═══════════════════════════════

const FeedManager = (() => {
  let events = [];
  let container = null;

  function init() {
    container = document.getElementById('feed-list');
  }

  function getRelativeTime(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }

  function renderItem(event, isNew = false) {
    const color = CONFIG.threatColors[event.type] || '#FFD600';
    const icon = CONFIG.threatIcons[event.type] || '⚠';
    const sev = event.severity || SEVERITY.LOW;
    const timeStr = getRelativeTime(event.time);
    const simBadge = event.simulated ? '<span class="feed-sim">SIM</span>' : '';

    const el = document.createElement('div');
    el.className = `feed-item${isNew ? ' feed-item-new' : ''}`;
    el.dataset.id = event.id;
    el.dataset.type = event.type;
    el.style.setProperty('--type-color', color);

    el.innerHTML = `
      <div class="feed-icon" style="color:${color};background:${color}15">${icon}</div>
      <div class="feed-body">
        <div class="feed-title">${event.shortTitle || event.title}</div>
        <div class="feed-meta">
          <span class="feed-location">${event.source}</span>
          ${simBadge}
        </div>
      </div>
      <div class="feed-right">
        <span class="feed-sev" style="background:${sev.color}20;color:${sev.color};border-color:${sev.color}40">${sev.label}</span>
        <span class="feed-time">${timeStr}</span>
      </div>
    `;

    el.addEventListener('click', () => {
      // Highlight
      document.querySelectorAll('.feed-item').forEach(i => i.classList.remove('feed-item-active'));
      el.classList.add('feed-item-active');
      // Fire event
      document.dispatchEvent(new CustomEvent('feed-click', { detail: event }));
    });

    return el;
  }

  function addEvent(event, isNew = false) {
    // Deduplicate
    if (events.find(e => e.id === event.id)) return;

    events.unshift(event);
    if (events.length > CONFIG.maxFeedItems) {
      events = events.slice(0, CONFIG.maxFeedItems);
    }

    if (!container) return;

    const el = renderItem(event, isNew);

    if (isNew) {
      container.insertBefore(el, container.firstChild);
      // Flash effect
      requestAnimationFrame(() => {
        el.style.background = `${CONFIG.threatColors[event.type] || '#FFD600'}20`;
        setTimeout(() => {
          el.style.background = '';
        }, 600);
      });
    } else {
      container.appendChild(el);
    }

    // Trim DOM
    while (container.children.length > CONFIG.maxFeedItems) {
      container.removeChild(container.lastChild);
    }
  }

  function addEvents(newEvents, isNew = false) {
    // Sort by time, newest first
    const sorted = [...newEvents].sort((a, b) => b.time - a.time);
    sorted.forEach(e => addEvent(e, isNew));
  }

  function clearFeed() {
    events = [];
    if (container) container.innerHTML = '';
  }

  function updateTimes() {
    if (!container) return;
    container.querySelectorAll('.feed-item').forEach(el => {
      const id = el.dataset.id;
      const event = events.find(e => e.id === id);
      if (!event) return;
      const timeEl = el.querySelector('.feed-time');
      if (timeEl) timeEl.textContent = getRelativeTime(event.time);
    });
  }

  function getCount() {
    return events.length;
  }

  function getAffectedCountries() {
    const countries = new Set();
    events.forEach(e => {
      const loc = e.title || e.shortTitle || '';
      // Simple heuristic: extract country-like words
      const known = ['Ukraine', 'Russia', 'Israel', 'Gaza', 'Lebanon', 'Iran', 'Syria',
        'Japan', 'Indonesia', 'Chile', 'Turkey', 'Greece', 'Italy', 'China', 'Korea',
        'Taiwan', 'Philippines', 'India', 'Pakistan', 'Mexico', 'Peru', 'Ecuador'];
      known.forEach(c => {
        if (loc.includes(c)) countries.add(c);
      });
    });
    return Math.max(countries.size, Math.min(events.length, 15));
  }

  // Start interval to refresh times
  setInterval(updateTimes, 30000);

  return { init, addEvent, addEvents, clearFeed, getCount, getAffectedCountries };
})();
