// ═══════════════════════════════
// EY — app.js
// Init, orchestration, refresh cycles
// ═══════════════════════════════

const App = (() => {
  let allEvents = [];
  let isInitialized = false;
  let refreshIntervals = [];

  // ── Bootstrap ──────────────────────────────────────────
  async function init() {
    console.log('[EY] Sistema iniciando...');

    // Init subsystems
    MapManager.init();
    FeedManager.init();
    UIManager.init();
    UIManager.initMobileSidebar();

    // Event bus listeners
    document.addEventListener('api-status', (e) => {
      UIManager.updateApiStatus(e.detail.id, e.detail.online);
    });

    document.addEventListener('feed-click', (e) => {
      const event = e.detail;
      MapManager.flyTo(event.lat, event.lon, event.type === 'earthquake' ? 7 : 8);
      setTimeout(() => MapManager.openPopup(event.id), 800);
    });

    document.addEventListener('event-click', (e) => {
      // Map marker was clicked — could highlight feed item
      const event = e.detail;
      const feedItem = document.querySelector(`.feed-item[data-id="${event.id}"]`);
      if (feedItem) {
        document.querySelectorAll('.feed-item').forEach(i => i.classList.remove('feed-item-active'));
        feedItem.classList.add('feed-item-active');
        feedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    // Button handlers
    document.getElementById('btn-my-location')?.addEventListener('click', () => {
      MapManager.flyToUser();
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      UIManager.toggleFullscreen();
    });

    document.getElementById('btn-center-world')?.addEventListener('click', () => {
      MapManager.map.flyTo(CONFIG.map.center, CONFIG.map.zoom, { duration: 1.5 });
    });

    // Geolocation
    initGeolocation();

    // Load initial data
    await loadAllData();

    // Start simulation
    const initialSim = AlertsSimulator.start((newEvent) => {
      processNewEvent(newEvent, true);
    });
    initialSim.forEach(e => processEvent(e, false));

    // Start refresh intervals
    startRefreshCycles();

    isInitialized = true;
    console.log('[EY] Sistema activo.');

    // Fade in
    document.body.classList.add('loaded');
  }

  // ── Geolocation ────────────────────────────────────────
  function initGeolocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        MapManager.setUserLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {}, // silently fail
      { timeout: 8000 }
    );
  }

  // ── Data loading ───────────────────────────────────────
  async function loadAllData() {
    try {
      const events = await ApiManager.fetchAll();
      const newIds = new Set(events.map(e => e.id));
      const existingIds = new Set(allEvents.map(e => e.id));

      // New events
      const fresh = events.filter(e => !existingIds.has(e.id));

      // Update allEvents
      allEvents = mergeEvents(allEvents, events);

      // Process
      fresh.forEach(e => processEvent(e, false));

      // Update UI
      updateGlobalAlertLevel();
      UIManager.updateStats(allEvents);

    } catch (e) {
      console.error('[EY] Data load failed:', e);
    }
  }

  function processEvent(event, isNew) {
    MapManager.addEvent(event);
    FeedManager.addEvent(event, isNew);
  }

  function processNewEvent(event, notify = true) {
    allEvents.unshift(event);
    MapManager.addEvent(event);
    FeedManager.addEvent(event, true);
    updateGlobalAlertLevel();
    UIManager.updateStats(allEvents);

    if (notify) {
      UIManager.sendNotification(event);
    }
  }

  function mergeEvents(existing, incoming) {
    const map = new Map(existing.map(e => [e.id, e]));
    incoming.forEach(e => map.set(e.id, e));
    return Array.from(map.values()).sort((a, b) => b.time - a.time).slice(0, 200);
  }

  // ── Alert level ────────────────────────────────────────
  function updateGlobalAlertLevel() {
    // Consider recent events (last 2 hours)
    const cutoff = Date.now() - 7200000;
    const recent = allEvents.filter(e => e.time.getTime() > cutoff);
    const simEvents = AlertsSimulator.getActive();
    const combined = [...recent, ...simEvents];

    const level = UIManager.computeAlertLevel(combined);
    UIManager.updateAlertMeter(level);
    UIManager.updateStats(combined);
  }

  // ── Refresh cycles ─────────────────────────────────────
  function startRefreshCycles() {
    // USGS hourly feed — every 60s
    refreshIntervals.push(setInterval(async () => {
      const events = await ApiManager.fetchUSGS(CONFIG.apis.usgsHour);
      const existing = new Set(allEvents.map(e => e.id));
      const fresh = events.filter(e => !existing.has(e.id));
      fresh.forEach(e => processNewEvent(e));
      allEvents = mergeEvents(allEvents, events);
      updateGlobalAlertLevel();
    }, CONFIG.apis.usgsHour.interval));

    // GDACS — every 3min
    refreshIntervals.push(setInterval(async () => {
      const events = await ApiManager.fetchGDACS();
      const existing = new Set(allEvents.map(e => e.id));
      const fresh = events.filter(e => !existing.has(e.id));
      fresh.forEach(e => processNewEvent(e));
      allEvents = mergeEvents(allEvents, events);
      updateGlobalAlertLevel();
    }, CONFIG.apis.gdacs.interval));

    // Tsunami — every 2min
    refreshIntervals.push(setInterval(async () => {
      const events = await ApiManager.fetchTsunami();
      const existing = new Set(allEvents.map(e => e.id));
      const fresh = events.filter(e => !existing.has(e.id));
      fresh.forEach(e => processNewEvent(e));
      allEvents = mergeEvents(allEvents, events);
      updateGlobalAlertLevel();
    }, CONFIG.apis.tsunami.interval));

    // Alert level decay/update every 30s
    refreshIntervals.push(setInterval(updateGlobalAlertLevel, 30000));
  }

  return { init };
})();

// ── Start ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(console.error);
});
