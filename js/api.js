// ═══════════════════════════════
// EY — api.js
// Fetch, parse, normalize all data sources
// ═══════════════════════════════

const ApiManager = (() => {
  // In-memory cache: apiId → { data, timestamp, ttl }
  const cache = new Map();
  // API status: apiId → { online, lastCheck }
  const status = new Map();

  let eventIdCounter = 0;
  function nextId() { return `evt_${Date.now()}_${++eventIdCounter}`; }

  // ── Cache helpers ──────────────────────────────────────
  function getCached(key, ttl) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) return null;
    return entry.data;
  }

  function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  function setApiStatus(id, online) {
    status.set(id, { online, lastCheck: Date.now() });
    document.dispatchEvent(new CustomEvent('api-status', { detail: { id, online } }));
  }

  // ── Normalize to common event format ──────────────────
  function normalizeEarthquake(feature) {
    const p = feature.properties;
    const [lon, lat, depth] = feature.geometry.coordinates;
    const mag = p.mag || 0;
    const sev = getSeverityByMag(mag);
    return {
      id: feature.id || nextId(),
      type: 'earthquake',
      title: p.place || 'Unknown location',
      shortTitle: `M${mag.toFixed(1)} ${(p.place || '').split(' of ').pop()?.substring(0, 30) || 'Earthquake'}`,
      lat, lon, depth,
      magnitude: mag,
      severity: sev,
      time: p.time ? new Date(p.time) : new Date(),
      source: 'USGS',
      url: p.url || null,
      status: p.status || 'automatic',
      felt: p.felt || 0,
      tsunami: p.tsunami === 1,
      raw: p,
    };
  }

  function parseGDACSItem(item) {
    try {
      const getText = (tag) => item.querySelector(tag)?.textContent?.trim() || '';
      const title = getText('title');
      const desc = getText('description');
      const pubDate = getText('pubDate');
      const link = getText('link');

      // Try to extract coordinates from georss or description
      let lat = 0, lon = 0;
      const pointEl = item.querySelector('point') || item.querySelector('georss\\:point');
      if (pointEl) {
        const parts = pointEl.textContent.trim().split(' ');
        lat = parseFloat(parts[0]) || 0;
        lon = parseFloat(parts[1]) || 0;
      } else {
        // Try to extract from description text
        const latMatch = desc.match(/lat[itude]*[:\s]+(-?\d+\.?\d*)/i);
        const lonMatch = desc.match(/lon[gitude]*[:\s]+(-?\d+\.?\d*)/i);
        if (latMatch) lat = parseFloat(latMatch[1]);
        if (lonMatch) lon = parseFloat(lonMatch[1]);
      }

      // Determine event type from title/description
      let type = 'storm';
      const titleLower = title.toLowerCase();
      if (titleLower.includes('earthquake') || titleLower.includes('seismic')) type = 'earthquake';
      else if (titleLower.includes('tsunami')) type = 'tsunami';
      else if (titleLower.includes('flood') || titleLower.includes('inundation')) type = 'flood';
      else if (titleLower.includes('cyclone') || titleLower.includes('hurricane') || titleLower.includes('typhoon') || titleLower.includes('storm')) type = 'storm';
      else if (titleLower.includes('fire') || titleLower.includes('wildfire')) type = 'fire';
      else if (titleLower.includes('nuclear') || titleLower.includes('radiation')) type = 'nuclear';

      // Alert level from GDACS
      let severity = SEVERITY.MEDIUM;
      const alertEl = item.querySelector('alertlevel') || item.querySelector('gdacs\\:alertlevel');
      const alertText = alertEl?.textContent?.toLowerCase() || '';
      if (alertText === 'red') severity = SEVERITY.CRITICAL;
      else if (alertText === 'orange') severity = SEVERITY.HIGH;
      else if (alertText === 'green') severity = SEVERITY.LOW;

      if (!lat && !lon) {
        // Assign approximate coordinates based on title keywords
        const coords = guessCoords(title);
        lat = coords.lat;
        lon = coords.lon;
      }

      return {
        id: nextId(),
        type,
        title,
        shortTitle: title.substring(0, 50),
        lat, lon,
        severity,
        time: pubDate ? new Date(pubDate) : new Date(),
        source: 'GDACS',
        url: link,
        raw: { title, desc },
      };
    } catch (e) {
      return null;
    }
  }

  function parseTsunamiItem(item) {
    try {
      const getText = (tag) => item.querySelector(tag)?.textContent?.trim() || '';
      const title = getText('title');
      const desc = getText('description');
      const pubDate = getText('pubDate');
      const link = getText('link');

      // Extract region from title
      let lat = 20, lon = -160; // Default Pacific
      const coords = guessCoords(title + ' ' + desc);
      if (coords.lat !== 0 || coords.lon !== 0) {
        lat = coords.lat;
        lon = coords.lon;
      }

      let severity = SEVERITY.HIGH;
      const titleLower = title.toLowerCase();
      if (titleLower.includes('warning')) severity = SEVERITY.CRITICAL;
      else if (titleLower.includes('watch')) severity = SEVERITY.HIGH;
      else if (titleLower.includes('advisory')) severity = SEVERITY.MEDIUM;
      else if (titleLower.includes('information') || titleLower.includes('cancel')) severity = SEVERITY.LOW;

      return {
        id: nextId(),
        type: 'tsunami',
        title,
        shortTitle: title.substring(0, 50),
        lat, lon,
        severity,
        time: pubDate ? new Date(pubDate) : new Date(),
        source: 'NOAA/PTWC',
        url: link,
        raw: { title, desc },
      };
    } catch (e) {
      return null;
    }
  }

  // Rough coordinate guesser from text
  function guessCoords(text) {
    const t = text.toLowerCase();
    const regions = [
      { keywords: ['japan', 'japanese'], lat: 36, lon: 138 },
      { keywords: ['indonesia', 'indonesian'], lat: -2, lon: 118 },
      { keywords: ['chile', 'chilean'], lat: -30, lon: -70 },
      { keywords: ['alaska'], lat: 61, lon: -150 },
      { keywords: ['california'], lat: 37, lon: -120 },
      { keywords: ['mexico', 'mexican'], lat: 23, lon: -102 },
      { keywords: ['peru', 'peruvian'], lat: -10, lon: -75 },
      { keywords: ['new zealand'], lat: -41, lon: 174 },
      { keywords: ['philippines', 'philippine'], lat: 13, lon: 122 },
      { keywords: ['turkey', 'turkish'], lat: 39, lon: 35 },
      { keywords: ['greece', 'greek'], lat: 38, lon: 23 },
      { keywords: ['italy', 'italian'], lat: 42, lon: 13 },
      { keywords: ['iran', 'iranian'], lat: 32, lon: 53 },
      { keywords: ['china', 'chinese'], lat: 35, lon: 105 },
      { keywords: ['india', 'indian'], lat: 20, lon: 77 },
      { keywords: ['pacific'], lat: 5, lon: -150 },
      { keywords: ['atlantic'], lat: 30, lon: -40 },
      { keywords: ['caribbean'], lat: 18, lon: -70 },
      { keywords: ['mediterranean'], lat: 37, lon: 18 },
      { keywords: ['africa', 'african'], lat: 0, lon: 25 },
      { keywords: ['australia', 'australian'], lat: -25, lon: 133 },
      { keywords: ['hawaii', 'hawaiian'], lat: 20, lon: -157 },
      { keywords: ['alaska'], lat: 64, lon: -153 },
    ];
    for (const r of regions) {
      if (r.keywords.some(k => t.includes(k))) {
        // Add small jitter
        return {
          lat: r.lat + (Math.random() - 0.5) * 4,
          lon: r.lon + (Math.random() - 0.5) * 4,
        };
      }
    }
    return { lat: 0, lon: 0 };
  }

  // ── Fetch functions ────────────────────────────────────
  async function fetchUSGS(apiConfig) {
    const cached = getCached(apiConfig.id, apiConfig.interval);
    if (cached) return cached;

    try {
      const res = await fetch(apiConfig.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const events = (json.features || []).map(normalizeEarthquake).filter(Boolean);
      setCache(apiConfig.id, events);
      setApiStatus(apiConfig.id, true);
      return events;
    } catch (e) {
      console.warn(`[EY] USGS fetch failed:`, e.message);
      setApiStatus(apiConfig.id, false);
      return getCached(apiConfig.id, Infinity) || [];
    }
  }

  async function fetchGDACS() {
    const cfg = CONFIG.apis.gdacs;
    const cached = getCached(cfg.id, cfg.interval);
    if (cached) return cached;

    try {
      const res = await fetch(cfg.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const xmlText = json.contents;
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));
      const events = items.map(parseGDACSItem).filter(Boolean);
      setCache(cfg.id, events);
      setApiStatus(cfg.id, true);
      return events;
    } catch (e) {
      console.warn(`[EY] GDACS fetch failed:`, e.message);
      setApiStatus(cfg.id, false);
      return getCached(cfg.id, Infinity) || [];
    }
  }

  async function fetchTsunami() {
    const cfg = CONFIG.apis.tsunami;
    const cached = getCached(cfg.id, cfg.interval);
    if (cached) return cached;

    try {
      const res = await fetch(cfg.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const xmlText = json.contents;
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));
      const events = items.map(parseTsunamiItem).filter(Boolean);
      setCache(cfg.id, events);
      setApiStatus(cfg.id, true);
      return events;
    } catch (e) {
      console.warn(`[EY] Tsunami fetch failed:`, e.message);
      setApiStatus(cfg.id, false);
      return getCached(cfg.id, Infinity) || [];
    }
  }

  async function fetchAll() {
    const [usgsHour, usgsMonth, gdacs, tsunami] = await Promise.all([
      fetchUSGS(CONFIG.apis.usgsHour),
      fetchUSGS(CONFIG.apis.usgsMonth),
      fetchGDACS(),
      fetchTsunami(),
    ]);

    // Merge and deduplicate
    const all = [...usgsHour, ...usgsMonth, ...gdacs, ...tsunami];
    const seen = new Set();
    return all.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }

  function getStatus(id) {
    return status.get(id) || { online: null, lastCheck: null };
  }

  return { fetchAll, fetchUSGS, fetchGDACS, fetchTsunami, getStatus };
})();
