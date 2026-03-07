// ═══════════════════════════════
// EY — ui.js
// HUD, counters, filters, alert level, notifications
// ═══════════════════════════════

const UIManager = (() => {
  let alertLevel = 0;
  let filters = {};
  let lastUpdateTimers = {};
  let notificationsEnabled = false;

  // ── Init ───────────────────────────────────────────────
  function init() {
    initClock();
    initFilters();
    initAlertMeter();
    initGlitch();
    initNotifications();
    initSearch();
    startSystemTimer();
  }

  // ── Real-time UTC clock ────────────────────────────────
  function initClock() {
    const el = document.getElementById('utc-clock');
    const dateEl = document.getElementById('utc-date');

    function tick() {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      if (el) el.textContent = `${h}:${m}:${s} UTC`;

      const d = now.toUTCString().split(' ').slice(0, 4).join(' ');
      if (dateEl) dateEl.textContent = d;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── System timer (last update countdown) ──────────────
  function startSystemTimer() {
    const el = document.getElementById('last-update');
    let seconds = 0;
    setInterval(() => {
      seconds++;
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }

  function resetSystemTimer() {
    const el = document.getElementById('last-update');
    // Reset counter in the actual timer by updating text
    if (el) el.textContent = '00:00:00';
    // Re-init
    startSystemTimer();
  }

  // ── Filters ────────────────────────────────────────────
  function initFilters() {
    const types = ['missile', 'drone', 'earthquake', 'tsunami', 'nuclear', 'fire', 'flood', 'storm'];
    const container = document.getElementById('filter-list');
    if (!container) return;

    types.forEach(type => {
      filters[type] = true;
      const color = CONFIG.threatColors[type];
      const icon = CONFIG.threatIcons[type];
      const label = type.toUpperCase();

      const item = document.createElement('div');
      item.className = 'filter-item';
      item.innerHTML = `
        <div class="filter-icon" style="color:${color}">${icon}</div>
        <span class="filter-label">${label}</span>
        <div class="filter-toggle active" data-type="${type}" style="--fc:${color}">
          <div class="filter-thumb"></div>
        </div>
      `;

      const toggle = item.querySelector('.filter-toggle');
      toggle.addEventListener('click', () => {
        filters[type] = !filters[type];
        toggle.classList.toggle('active', filters[type]);
        MapManager.setFilter(type, filters[type]);
        updateStats();
      });

      container.appendChild(item);
    });
  }

  // ── Alert Level Meter ─────────────────────────────────
  function initAlertMeter() {
    updateAlertMeter(0);
  }

  function updateAlertMeter(level) {
    alertLevel = Math.max(0, Math.min(100, level));

    const circle = document.getElementById('alert-circle');
    const label = document.getElementById('alert-level-val');
    const statusEl = document.getElementById('alert-status-text');

    if (circle) {
      const circumference = 2 * Math.PI * 54;
      const dashOffset = circumference - (alertLevel / 100) * circumference;
      circle.style.strokeDashoffset = dashOffset;

      let color = CONFIG.colors.green;
      if (alertLevel > 75) color = CONFIG.colors.red;
      else if (alertLevel > 50) color = CONFIG.colors.orange;
      else if (alertLevel > 25) color = CONFIG.colors.yellow;
      circle.style.stroke = color;

      if (label) {
        animateCount(label, parseInt(label.textContent) || 0, Math.round(alertLevel));
        label.style.color = color;
      }
    }

    if (statusEl) {
      let text = 'NOMINAL';
      if (alertLevel > 75) text = 'CRÍTICO';
      else if (alertLevel > 50) text = 'ELEVADO';
      else if (alertLevel > 25) text = 'MODERADO';
      statusEl.textContent = text;
    }
  }

  function computeAlertLevel(events) {
    if (!events.length) return 0;
    let score = 0;
    events.forEach(e => {
      score += (e.severity?.weight || 1);
    });
    return Math.min(100, (score / (events.length * 3)) * 100);
  }

  // ── Stats counters ─────────────────────────────────────
  function updateStats(events = []) {
    const countEl = document.getElementById('stat-events');
    const countriesEl = document.getElementById('stat-countries');
    const lastEl = document.getElementById('stat-last');

    if (countEl) animateCount(countEl, parseInt(countEl.textContent) || 0, events.length || FeedManager.getCount());
    if (countriesEl) animateCount(countriesEl, parseInt(countriesEl.textContent) || 0, FeedManager.getAffectedCountries());

    if (events.length > 0 && lastEl) {
      const latest = events.sort((a, b) => b.time - a.time)[0];
      if (latest) {
        lastEl.textContent = latest.shortTitle?.substring(0, 25) || 'N/A';
      }
    }
  }

  // ── Count-up animation ─────────────────────────────────
  function animateCount(el, from, to) {
    if (from === to) return;
    const duration = 600;
    const start = performance.now();
    const diff = to - from;

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + diff * eased);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = to;
    }
    requestAnimationFrame(step);
  }

  // ── API Status indicators ──────────────────────────────
  function updateApiStatus(id, online) {
    const dot = document.querySelector(`.api-dot[data-id="${id}"]`);
    const label = document.querySelector(`.api-label[data-id="${id}"]`);
    if (dot) {
      dot.classList.toggle('online', online);
      dot.classList.toggle('offline', !online);
    }
    if (label) {
      label.style.opacity = online ? '1' : '0.4';
    }
  }

  // ── Glitch effect on logo ─────────────────────────────
  function initGlitch() {
    const logo = document.getElementById('main-logo');
    if (!logo) return;

    function triggerGlitch() {
      logo.classList.add('glitch-active');
      setTimeout(() => logo.classList.remove('glitch-active'), 600);
    }

    // Auto every 8 seconds
    setInterval(triggerGlitch, 8000);
    // Also on hover
    logo.addEventListener('mouseenter', triggerGlitch);
  }

  // ── Notifications ──────────────────────────────────────
  function initNotifications() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      notificationsEnabled = true;
    } else if (Notification.permission !== 'denied') {
      // Ask after 3 seconds
      setTimeout(() => {
        Notification.requestPermission().then(p => {
          notificationsEnabled = p === 'granted';
        });
      }, 3000);
    }
  }

  function sendNotification(event) {
    if (!notificationsEnabled) return;
    if (event.severity?.level < 3) return; // Only HIGH/CRITICAL

    const icon = CONFIG.threatIcons[event.type] || '⚠';
    try {
      new Notification(`EY ALERT: ${icon} ${event.type.toUpperCase()}`, {
        body: event.shortTitle || event.title,
        icon: '/favicon.ico',
        tag: event.id,
        requireInteraction: event.severity?.level === 4,
      });
    } catch (e) {}
  }

  // ── Search ─────────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('location-search');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (!query) return;
        geocodeSearch(query);
      }
    });
  }

  async function geocodeSearch(query) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        MapManager.flyTo(parseFloat(lat), parseFloat(lon), 8);
      }
    } catch (e) {
      console.warn('[EY] Geocode failed:', e);
    }
  }

  // ── Fullscreen ─────────────────────────────────────────
  function toggleFullscreen() {
    const mapEl = document.getElementById('map');
    if (!document.fullscreenElement) {
      mapEl?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // ── Signal lost effect ────────────────────────────────
  function signalLost(apiId) {
    const dot = document.querySelector(`.api-dot[data-id="${apiId}"]`);
    if (dot) {
      dot.classList.add('signal-lost');
    }
  }

  // ── Sidebar toggle (mobile) ────────────────────────────
  function initMobileSidebar() {
    const filterBtn = document.getElementById('mobile-filter-btn');
    const leftSidebar = document.getElementById('sidebar-left');
    const feedSheet = document.getElementById('feed-sheet');
    const feedBtn = document.getElementById('mobile-feed-btn');

    filterBtn?.addEventListener('click', () => {
      leftSidebar?.classList.toggle('mobile-open');
    });
    feedBtn?.addEventListener('click', () => {
      feedSheet?.classList.toggle('sheet-open');
    });

    // Close on map click
    document.getElementById('map')?.addEventListener('click', () => {
      leftSidebar?.classList.remove('mobile-open');
      feedSheet?.classList.remove('sheet-open');
    });
  }

  return {
    init, updateAlertMeter, computeAlertLevel, updateStats,
    updateApiStatus, sendNotification, resetSystemTimer,
    toggleFullscreen, initMobileSidebar, animateCount,
  };
})();
