/* ═══════════════════════════════════════
   GES — app.js
   Main init, orchestration, real-time loop
   ═══════════════════════════════════════ */

const App = (() => {

  function init() {
    console.log('[GES] Inicializando sistema...');

    // Request notifications
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 2000);
    }

    // Geolocation
    navigator.geolocation?.getCurrentPosition(
      pos => MapEngine.addUserLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}, { timeout: 6000 }
    );

    // Init map
    MapEngine.init('main-map');

    // Init UI modules
    Pages.initNav();
    Pages.initFilters();
    Charts.initActivityData();

    // Clock
    startClock();

    // Start simulator + get initial batch
    const { events, alerts } = Simulator.start((newEvt, newAlert) => {
      onNewEvent(newEvt, newAlert);
    });

    // Load initial data onto map + feed
    events.forEach(evt => {
      MapEngine.addEvent(evt);
      Pages.addFeedItem(evt, false);
    });

    // Initial UI update
    updateDashboardStats();
    Pages.buildTicker(events);
    Charts.drawActivityChart();

    // Periodic updates
    setInterval(tickUpdate, 1000);
    setInterval(() => {
      updateDashboardStats();
      if (Pages.currentPage === 'tracker') Pages.renderTracker();
      if (Pages.currentPage === 'alerts') Pages.renderAlerts();
    }, 5000);

    setInterval(() => {
      if (Pages.currentPage === 'intel') Pages.renderIntel();
      Charts.drawActivityChart();
    }, 30000);

    // Update map marker icons for status changes
    setInterval(() => {
      Simulator.getEvents('all').forEach(evt => {
        MapEngine.updateEvent(evt);
      });
    }, 2000);

    // Page resize — redraw charts
    window.addEventListener('resize', debounce(() => {
      Charts.drawActivityChart();
    }, 300));

    console.log('[GES] Sistema activo.');

    // Fade in
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '1';
    });
  }

  function onNewEvent(evt, alert) {
    // Add to map
    MapEngine.addEvent(evt);

    // Add to feed
    Pages.addFeedItem(evt, true);

    // Flash notification for HIGH/CRITICAL
    Pages.showAlertFlash(evt);

    // Update stats
    updateDashboardStats();
    Charts.bumpCurrentHour();

    // Update alerts badge
    document.getElementById('nav-alert-count').textContent =
      Simulator.getAlerts('all').length;

    // If on tracker/alerts page, refresh
    if (Pages.currentPage === 'tracker') Pages.renderTracker();
    if (Pages.currentPage === 'alerts') Pages.renderAlerts();
    if (Pages.currentPage === 'intel') Pages.renderIntel();
  }

  function updateDashboardStats() {
    const stats = Simulator.getStats();

    // Hero numbers
    animEl('hsg-active', stats.active);
    animEl('hsg-today', stats.today);
    animEl('hsg-critical', stats.critical);

    // Threat gauge
    const threatLevel = Charts.computeThreatLevel(stats);
    Charts.updateGauge(threatLevel);

    // Threat bars
    Charts.buildThreatBars(stats);
  }

  function animEl(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent) || 0;
    if (current !== val) Charts.animateNumber(el, current, val);
  }

  // ── Real-time clock ────────────────────────────────────
  function startClock() {
    function tick() {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2,'0');
      const m = String(now.getUTCMinutes()).padStart(2,'0');
      const s = String(now.getUTCSeconds()).padStart(2,'0');
      const el = document.getElementById('nav-clock');
      if (el) el.textContent = `${h}:${m}:${s} UTC`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── Periodic tick: update ETAs etc ──────────────────────
  let lastTickerUpdate = 0;
  function tickUpdate() {
    // Update feed item ETAs
    document.querySelectorAll('.feed-item').forEach(el => {
      const id = el.dataset.id;
      const evt = Simulator.getEvents('all').find(e => e.id === id);
      if (!evt) return;
      const etaEl = el.querySelector('.fi-time');
      if (etaEl) {
        const eta = Simulator.formatETA(evt);
        const statusEl = el.querySelector('.status-badge');
        if (statusEl) {
          statusEl.className = `status-badge ${evt.status}`;
          statusEl.textContent = evt.status.toUpperCase();
        }
        if (etaEl && eta !== '--:--' && evt.status === 'active') {
          etaEl.textContent = 'ETA ' + eta;
        }
      }
    });

    // Refresh ticker every 60s
    if (Date.now() - lastTickerUpdate > 60000) {
      Pages.buildTicker(Simulator.getEvents('all'));
      lastTickerUpdate = Date.now();
    }
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
