/* ═══════════════════════════════════════
   GES — simulator.js
   Realistic missile event simulation engine
   ═══════════════════════════════════════ */

const Simulator = (() => {
  let events = [];
  let alerts = [];
  let timers = [];
  let idCounter = 0;
  let paused = false;

  const INTERCEPT_PROBABILITY = {
    cruise: 0.28,
    ballistic: 0.22,
    hypersonic: 0.05,
    drone: 0.45,
  };

  const STATUS_PROGRESSION = {
    active: ['active', 'active', 'active', 'tracking'],
    tracking: ['tracking', 'impact', 'intercepted'],
    impact: ['impact'],
    intercepted: ['intercepted'],
  };

  const TRAJECTORY_DESCRIPTIONS = {
    cruise: [
      'Vuelo bajo con evasión de radar',
      'Trayectoria sinuosa programada',
      'Aproximación desde el oeste evitando sistemas SAM',
      'Vuelo rasante sobre agua',
    ],
    ballistic: [
      'Trayectoria balística estándar',
      'Lanzamiento en ángulo lofted — altitud máxima extendida',
      'Trayectoria deprimida — tiempo de vuelo reducido',
      'Maniobra post-apogeo detectada',
    ],
    hypersonic: [
      'Planeo hipersónico con maniobra evasiva',
      'Descenso en espiral desde 80km',
      'Velocidad variable — dificulta predicción de impacto',
      'Zona de impacto estimada — baja certeza',
    ],
    drone: [
      'Enjambre coordinado — múltiples vectores',
      'Vuelo autónomo por waypoints programados',
      'Coordinación con ataque de misiles',
    ],
  };

  function nextId() {
    return `GES-${String(++idCounter).padStart(5,'0')}`;
  }

  function weightedZone() {
    const zones = Object.keys(CONFLICT_ZONES);
    const weights = zones.map(k => CONFLICT_ZONES[k].weight);
    const total = weights.reduce((a,b) => a+b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < zones.length; i++) {
      r -= weights[i];
      if (r <= 0) return zones[i];
    }
    return zones[0];
  }

  function getSystemForZone(zoneKey) {
    const zone = CONFLICT_ZONES[zoneKey];
    const sysId = getRandomItem(zone.systems);
    return getMissileData(sysId) || MISSILE_DB[0];
  }

  function calculateETA(distKm, speedMs) {
    const seconds = (distKm * 1000) / speedMs;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return { seconds: Math.round(seconds), label: `${mins}:${String(secs).padStart(2,'0')}` };
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const d = (a, b) => (b - a) * Math.PI / 180;
    const a = Math.sin(d(lat1,lat2)/2)**2 +
      Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(d(lon1,lon2)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function generateEvent() {
    const zoneKey = weightedZone();
    const zone = CONFLICT_ZONES[zoneKey];
    const system = getSystemForZone(zoneKey);
    const launch = getRandomItem(zone.launches);
    const target = getRandomItem(zone.targets);

    const distKm = calculateDistance(launch.lat, launch.lon, target.lat, target.lon);
    const eta = calculateETA(distKm, system.speed);

    // Is this within system range?
    const inRange = distKm <= system.range;
    if (!inRange && Math.random() < 0.7) return null; // Skip out-of-range launches most times

    const isIntercepted = Math.random() < (INTERCEPT_PROBABILITY[system.type] || 0.2);
    const description = getRandomItem(TRAJECTORY_DESCRIPTIONS[system.type] || TRAJECTORY_DESCRIPTIONS.cruise);

    // Add small jitter to positions
    const launchLat = launch.lat + (Math.random()-0.5) * 0.15;
    const launchLon = launch.lon + (Math.random()-0.5) * 0.15;
    const targetLat = target.lat + (Math.random()-0.5) * 0.1;
    const targetLon = target.lon + (Math.random()-0.5) * 0.1;

    // Severity based on system type and range
    let severity = SEV.MEDIUM;
    if (system.type === 'hypersonic' || system.type === 'ballistic' && system.range > 5000) severity = SEV.CRITICAL;
    else if (system.type === 'ballistic') severity = SEV.HIGH;
    else if (system.type === 'cruise' && system.range > 1000) severity = SEV.HIGH;

    const event = {
      id: nextId(),
      systemId: system.id,
      system,
      zone: zoneKey,
      zoneName: zone.name,
      type: system.type,

      launchSite: launch.name,
      targetSite: target.name,
      launchLat, launchLon,
      targetLat, targetLon,

      distKm: Math.round(distKm),
      eta,
      etaRemaining: eta.seconds,
      speedMs: system.speed,
      speedMach: system.speedMach,
      altitudeM: system.altitude,
      description,

      status: 'active',
      isIntercepted,
      interceptBattery: isIntercepted ? getRandomItem(['Iron Dome', 'Arrow-3', 'THAAD', 'Patriot PAC-3', 'S-400', 'Aegis BMD']) : null,

      severity,
      time: new Date(),
      ttl: Math.min(eta.seconds * 2, 600), // max 10 min on map
      simulated: true,

      warningLevel: system.type === 'hypersonic' ? 5 :
                    severity === SEV.CRITICAL ? 4 :
                    severity === SEV.HIGH ? 3 : 2,
    };

    return event;
  }

  function buildAlertFromEvent(event) {
    const timeStr = event.time.toISOString().substr(11,8) + ' UTC';
    return {
      id: `ALT-${event.id}`,
      eventId: event.id,
      title: `${event.system.name} — ${event.launchSite} → ${event.targetSite}`,
      sub: `${event.zoneName} · ${event.system.type.toUpperCase()} · ETA ${event.eta.label} · ${timeStr}`,
      severity: event.severity,
      time: event.time,
      event,
      read: false,
    };
  }

  function scheduleNext(onNew) {
    if (paused) return;
    // Variable interval: 8–25 seconds
    const delay = 8000 + Math.random() * 17000;
    const t = setTimeout(() => {
      const evt = generateEvent();
      if (evt) {
        events.unshift(evt);
        const alert = buildAlertFromEvent(evt);
        alerts.unshift(alert);
        // Keep max 200 events
        if (events.length > 200) events = events.slice(0, 200);
        if (alerts.length > 100) alerts = alerts.slice(0, 100);
        onNew(evt, alert);
      }
      scheduleNext(onNew);
    }, delay);
    timers.push(t);
  }

  function generateInitialBatch() {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count * 3; i++) {
      const evt = generateEvent();
      if (!evt) continue;
      // Backdate
      const ago = Math.random() * 7200000; // up to 2h ago
      evt.time = new Date(Date.now() - ago);
      evt.id = nextId();

      // Some are already resolved
      if (ago > 3600000) {
        evt.status = evt.isIntercepted ? 'intercepted' : 'impact';
        evt.etaRemaining = 0;
      } else if (ago > 1800000) {
        evt.status = 'tracking';
      }

      events.push(evt);
      const alert = buildAlertFromEvent(evt);
      alerts.push(alert);

      if (events.length >= count) break;
    }
    // Sort newest first
    events.sort((a,b) => b.time - a.time);
    alerts.sort((a,b) => b.time - a.time);
  }

  // Countdown ETAs
  function tick() {
    const now = Date.now();
    events.forEach(evt => {
      if (evt.status !== 'active' && evt.status !== 'tracking') return;
      const elapsed = Math.floor((now - evt.time.getTime()) / 1000);
      const remaining = evt.eta.seconds - elapsed;

      if (remaining <= 0) {
        evt.etaRemaining = 0;
        evt.status = evt.isIntercepted ? 'intercepted' : 'impact';
      } else {
        evt.etaRemaining = remaining;
        if (remaining < evt.eta.seconds * 0.3 && evt.status === 'active') {
          evt.status = 'tracking';
        }
      }
    });
  }

  function start(onNew) {
    generateInitialBatch();
    scheduleNext(onNew);
    setInterval(tick, 1000);
    return { events, alerts };
  }

  function pause() { paused = true; }
  function resume(onNew) { paused = false; scheduleNext(onNew); }
  function stop() { timers.forEach(clearTimeout); timers = []; }

  function getEvents(filter) {
    if (!filter || filter === 'all') return events;
    return events.filter(e => {
      if (filter === 'intercepted') return e.status === 'intercepted';
      if (filter === 'drone') return e.type === 'drone';
      return e.type === filter;
    });
  }

  function getAlerts(filter) {
    if (!filter || filter === 'all') return alerts;
    const map = { critical: SEV.CRITICAL, high: SEV.HIGH, medium: SEV.MEDIUM };
    return alerts.filter(a => a.severity === (map[filter] || a.severity));
  }

  function getStats() {
    const active = events.filter(e => e.status === 'active' || e.status === 'tracking');
    const today = events.filter(e => {
      const h = (Date.now() - e.time.getTime()) / 3600000;
      return h < 24;
    });
    const critical = events.filter(e => e.severity === SEV.CRITICAL && (Date.now() - e.time.getTime()) < 3600000);
    const intercepted = events.filter(e => e.status === 'intercepted');
    const impacts = events.filter(e => e.status === 'impact');

    const byType = {};
    events.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    const byZone = {};
    events.forEach(e => {
      byZone[e.zoneName] = (byZone[e.zoneName] || 0) + 1;
    });

    const bySystem = {};
    events.forEach(e => {
      const name = e.system?.name || 'Unknown';
      bySystem[name] = (bySystem[name] || 0) + 1;
    });

    return {
      active: active.length,
      today: today.length,
      critical: critical.length,
      intercepted: intercepted.length,
      impacts: impacts.length,
      total: events.length,
      interceptRate: events.length > 0 ? Math.round(intercepted.length / events.length * 100) : 0,
      byType, byZone, bySystem,
    };
  }

  function formatETA(evt) {
    if (evt.status === 'intercepted') return 'INTERCEPTADO';
    if (evt.status === 'impact') return 'IMPACTO';
    if (evt.etaRemaining <= 0) return '--:--';
    const m = Math.floor(evt.etaRemaining / 60);
    const s = evt.etaRemaining % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  return { start, pause, resume, stop, getEvents, getAlerts, getStats, formatETA };
})();
