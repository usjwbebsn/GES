// ═══════════════════════════════
// EY — alerts.js
// Realistic simulated missile/drone events
// ═══════════════════════════════

const AlertsSimulator = (() => {
  let timer = null;
  let active = [];
  let trajectories = new Map(); // id → polyline

  // Realistic weapon systems data
  const WEAPON_SYSTEMS = {
    missile: [
      { name: 'Kalibr', range: 1500, speed: 240, icon: '🚀' },
      { name: 'Iskander-M', range: 500, speed: 700, icon: '🚀' },
      { name: 'Kh-101', range: 2800, speed: 200, icon: '🚀' },
      { name: 'Kinzhal', range: 2000, speed: 3500, icon: '🚀' },
      { name: 'Onyx', range: 600, speed: 750, icon: '🚀' },
      { name: 'Shahab-3', range: 1300, speed: 300, icon: '🚀' },
      { name: 'Hwasong-15', range: 13000, speed: 800, icon: '🚀' },
      { name: 'DF-21D', range: 1700, speed: 3000, icon: '🚀' },
      { name: 'AGM-158 JASSM', range: 925, speed: 280, icon: '🚀' },
    ],
    drone: [
      { name: 'Shahed-136', range: 1800, speed: 185, icon: '✈' },
      { name: 'Lancet-3', range: 40, speed: 110, icon: '✈' },
      { name: 'KUB-BLA', range: 40, speed: 130, icon: '✈' },
      { name: 'TB2 Bayraktar', range: 150, speed: 222, icon: '✈' },
      { name: 'WJ-700', range: 2000, speed: 700, icon: '✈' },
      { name: 'Mohajer-6', range: 200, speed: 200, icon: '✈' },
    ],
  };

  // Target cities/areas per conflict zone
  const TARGETS = {
    ukraine: {
      launches: [
        { name: 'Belgorod Oblast', lat: 50.6, lon: 36.6 },
        { name: 'Crimea', lat: 45.0, lon: 34.0 },
        { name: 'Kursk Oblast', lat: 51.7, lon: 36.1 },
      ],
      targets: [
        { name: 'Kyiv', lat: 50.45, lon: 30.52 },
        { name: 'Kharkiv', lat: 49.98, lon: 36.23 },
        { name: 'Zaporizhzhia', lat: 47.84, lon: 35.14 },
        { name: 'Odesa', lat: 46.47, lon: 30.72 },
        { name: 'Dnipro', lat: 48.46, lon: 35.04 },
        { name: 'Mykolaiv', lat: 46.97, lon: 32.0 },
        { name: 'Sumy', lat: 50.91, lon: 34.79 },
        { name: 'Lviv', lat: 49.84, lon: 24.03 },
      ],
    },
    middleEast: {
      launches: [
        { name: 'Southern Lebanon', lat: 33.3, lon: 35.5 },
        { name: 'Gaza Strip', lat: 31.35, lon: 34.3 },
        { name: 'Yemen', lat: 15.5, lon: 44.2 },
        { name: 'Iran (Tabriz)', lat: 38.0, lon: 46.3 },
      ],
      targets: [
        { name: 'Tel Aviv', lat: 32.07, lon: 34.78 },
        { name: 'Haifa', lat: 32.81, lon: 34.99 },
        { name: 'Eilat', lat: 29.56, lon: 34.95 },
        { name: 'Ashkelon', lat: 31.67, lon: 34.57 },
        { name: 'Riyadh', lat: 24.68, lon: 46.72 },
        { name: 'Aden', lat: 12.77, lon: 45.03 },
        { name: 'Hodeidah Port', lat: 14.8, lon: 42.95 },
      ],
    },
    southChinaSea: {
      launches: [
        { name: 'Hainan Island', lat: 20.0, lon: 110.3 },
        { name: 'Fujian Province', lat: 26.0, lon: 119.3 },
      ],
      targets: [
        { name: 'Taiwan Strait', lat: 24.5, lon: 120.0 },
        { name: 'Paracel Islands', lat: 16.5, lon: 112.0 },
        { name: 'Spratly Islands', lat: 9.5, lon: 114.5 },
      ],
    },
    northKorea: {
      launches: [
        { name: 'Pyongyang', lat: 39.03, lon: 125.75 },
        { name: 'Sinpo', lat: 40.0, lon: 128.2 },
      ],
      targets: [
        { name: 'Sea of Japan', lat: 37.5, lon: 132.0 },
        { name: 'Pacific Ocean', lat: 35.0, lon: 140.0 },
      ],
    },
    sahel: {
      launches: [
        { name: 'Mali (Bamako)', lat: 12.65, lon: -8.0 },
        { name: 'Burkina Faso', lat: 12.36, lon: -1.53 },
      ],
      targets: [
        { name: 'Sahel Region', lat: 15.0, lon: 5.0 },
        { name: 'Timbuktu', lat: 16.77, lon: -3.0 },
      ],
    },
  };

  const INTERCEPT_MESSAGES = [
    'INTERCEPTADO POR DEFENSA ANTIAÉREA',
    'DESTRUIDO EN VUELO',
    'IMPACTO CONFIRMADO',
    'TRAYECTORIA PERDIDA',
    'DETONACIÓN DETECTADA',
  ];

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function weightedRandom(zones) {
    const keys = Object.keys(zones);
    const weights = keys.map(k => zones[k].weight);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < keys.length; i++) {
      r -= weights[i];
      if (r <= 0) return keys[i];
    }
    return keys[0];
  }

  function generateEvent() {
    // Pick conflict zone
    const zoneKey = weightedRandom(CONFIG.conflictZones);
    const zone = CONFIG.conflictZones[zoneKey];
    const targetData = TARGETS[zoneKey];

    // Pick type
    const types = zone.types;
    const type = types[Math.floor(Math.random() * types.length)];

    // Pick weapon
    const weapons = WEAPON_SYSTEMS[type];
    const weapon = weapons[Math.floor(Math.random() * weapons.length)];

    // Pick launch and target
    let launchSite, targetSite;
    if (targetData) {
      launchSite = targetData.launches[Math.floor(Math.random() * targetData.launches.length)];
      targetSite = targetData.targets[Math.floor(Math.random() * targetData.targets.length)];
    } else {
      launchSite = {
        name: zone.name,
        lat: zone.center[0] + randomBetween(-zone.spread, zone.spread),
        lon: zone.center[1] + randomBetween(-zone.spread, zone.spread),
      };
      targetSite = {
        name: zone.name + ' (Target)',
        lat: zone.center[0] + randomBetween(-zone.spread * 1.5, zone.spread * 1.5),
        lon: zone.center[1] + randomBetween(-zone.spread * 1.5, zone.spread * 1.5),
      };
    }

    const isIntercepted = Math.random() < 0.3;
    const status = isIntercepted
      ? INTERCEPT_MESSAGES[Math.floor(Math.random() * INTERCEPT_MESSAGES.length)]
      : 'ACTIVO — EN TRAYECTORIA';

    const severity = type === 'missile' ? SEVERITY.CRITICAL : SEVERITY.HIGH;

    return {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      title: `${weapon.name} detectado — ${zone.name}`,
      shortTitle: `${type === 'missile' ? '🚀' : '✈'} ${weapon.name} → ${targetSite.name}`,
      lat: launchSite.lat,
      lon: launchSite.lon,
      targetLat: targetSite.lat,
      targetLon: targetSite.lon,
      launchSite: launchSite.name,
      targetSite: targetSite.name,
      weapon,
      status,
      isIntercepted,
      severity,
      time: new Date(),
      source: 'SISTEMA DE ALERTA TEMPRANA',
      simulated: true,
      ttl: 180000, // 3 minutes on map
    };
  }

  function scheduleNext(callback) {
    const delay = randomBetween(
      CONFIG.simulation.minInterval,
      CONFIG.simulation.maxInterval
    );
    timer = setTimeout(() => {
      const event = generateEvent();
      active.push(event);
      callback(event);
      // Expire old events
      const now = Date.now();
      active = active.filter(e => (now - e.time.getTime()) < (e.ttl || 180000));
      scheduleNext(callback);
    }, delay);
  }

  function start(callback) {
    // Generate initial batch
    const initialCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < initialCount; i++) {
      const event = generateEvent();
      // Backdate slightly
      event.time = new Date(Date.now() - randomBetween(60000, 1200000));
      active.push(event);
    }

    scheduleNext(callback);
    return active;
  }

  function stop() {
    if (timer) clearTimeout(timer);
  }

  function getActive() {
    const now = Date.now();
    active = active.filter(e => (now - e.time.getTime()) < (e.ttl || 180000));
    return active;
  }

  return { start, stop, getActive, generateEvent };
})();
