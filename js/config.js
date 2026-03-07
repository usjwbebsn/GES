// ═══════════════════════════════
// EY — GLOBAL THREAT MONITOR
// config.js — URLs, intervals, colors, constants
// ═══════════════════════════════

const CONFIG = {
  app: {
    name: 'EY',
    version: '1.0',
    subtitle: 'GLOBAL THREAT MONITOR // LIVE',
  },

  apis: {
    usgsHour: {
      id: 'usgs_hour',
      label: 'USGS HOUR',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
      interval: 60000,
      type: 'earthquake',
    },
    usgsMonth: {
      id: 'usgs_month',
      label: 'USGS SIG',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
      interval: 180000,
      type: 'earthquake',
    },
    gdacs: {
      id: 'gdacs',
      label: 'GDACS',
      url: 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.gdacs.org/xml/rss.xml'),
      interval: 180000,
      type: 'disaster',
    },
    tsunami: {
      id: 'tsunami',
      label: 'NOAA',
      url: 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.tsunami.gov/events/xml/PHEBrss.xml'),
      interval: 120000,
      type: 'tsunami',
    },
  },

  simulation: {
    interval: 30000,
    minInterval: 15000,
    maxInterval: 45000,
  },

  map: {
    center: [20, 0],
    zoom: 2.5,
    minZoom: 2,
    maxZoom: 18,
  },

  colors: {
    bg: '#000408',
    panel: '#030D14',
    border: '#0A2535',
    cyan: '#00E5FF',
    red: '#FF1744',
    orange: '#FF6D00',
    yellow: '#FFD600',
    green: '#00E676',
    text: '#B0BEC5',
    grid: 'rgba(0,229,255,0.04)',
  },

  threatColors: {
    missile: '#FF1744',
    drone: '#FF6D00',
    earthquake: '#FFD600',
    tsunami: '#00B0FF',
    nuclear: '#FF6D00',
    fire: '#FF3D00',
    flood: '#0091EA',
    storm: '#AA00FF',
  },

  threatIcons: {
    missile: '🚀',
    drone: '✈',
    earthquake: '🌍',
    tsunami: '🌊',
    nuclear: '☢',
    fire: '🔥',
    flood: '💧',
    storm: '⚡',
  },

  // Conflict zones for simulation
  conflictZones: {
    ukraine: {
      name: 'UKRAINE',
      center: [49.0, 32.0],
      spread: 3.0,
      types: ['missile', 'drone'],
      weight: 0.35,
    },
    middleEast: {
      name: 'MIDDLE EAST',
      center: [32.0, 35.5],
      spread: 4.0,
      types: ['missile', 'drone'],
      weight: 0.35,
    },
    southChinaSea: {
      name: 'SOUTH CHINA SEA',
      center: [15.0, 114.0],
      spread: 5.0,
      types: ['missile', 'drone'],
      weight: 0.15,
    },
    northKorea: {
      name: 'KOREAN PENINSULA',
      center: [38.5, 127.5],
      spread: 2.0,
      types: ['missile'],
      weight: 0.10,
    },
    sahel: {
      name: 'SAHEL REGION',
      center: [15.0, 5.0],
      spread: 6.0,
      types: ['drone'],
      weight: 0.05,
    },
  },

  maxFeedItems: 50,
  alertLevelDecay: 0.995, // per second
};

// Severity levels
const SEVERITY = {
  CRITICAL: { label: 'CRÍTICO', level: 4, color: '#FF1744', weight: 10 },
  HIGH: { label: 'ALTO', level: 3, color: '#FF6D00', weight: 6 },
  MEDIUM: { label: 'MEDIO', level: 2, color: '#FFD600', weight: 3 },
  LOW: { label: 'BAJO', level: 1, color: '#00E676', weight: 1 },
};

function getSeverityByMag(mag) {
  if (mag >= 7) return SEVERITY.CRITICAL;
  if (mag >= 5) return SEVERITY.HIGH;
  if (mag >= 3) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

function getSeverityByType(type) {
  switch (type) {
    case 'missile': return SEVERITY.CRITICAL;
    case 'nuclear': return SEVERITY.CRITICAL;
    case 'tsunami': return SEVERITY.HIGH;
    case 'drone': return SEVERITY.HIGH;
    case 'storm': return SEVERITY.MEDIUM;
    case 'fire': return SEVERITY.MEDIUM;
    case 'flood': return SEVERITY.MEDIUM;
    default: return SEVERITY.LOW;
  }
}
