// ═══════════════════════════════
// EY — map.js
// Leaflet init, markers, popups, layers
// ═══════════════════════════════

const MapManager = (() => {
  let map = null;
  let markerClusterGroup = null;
  let markersMap = new Map(); // eventId → { marker, layers[] }
  let userMarker = null;
  let userLat = null, userLon = null;
  let activeFilters = new Set(['missile', 'drone', 'earthquake', 'tsunami', 'nuclear', 'fire', 'flood', 'storm']);
  let trajectoryLayers = new Map();

  // ── Init ───────────────────────────────────────────────
  function init() {
    map = L.map('map', {
      center: CONFIG.map.center,
      zoom: CONFIG.map.zoom,
      minZoom: CONFIG.map.minZoom,
      maxZoom: CONFIG.map.maxZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      className: 'map-tiles-dark',
    }).addTo(map);

    // Custom zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Marker cluster
    if (typeof L.markerClusterGroup === 'function') {
      markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="cluster-icon"><span>${count}</span></div>`,
            className: 'cluster-wrapper',
            iconSize: [44, 44],
          });
        },
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
      });
      map.addLayer(markerClusterGroup);
    }

    // Attribution
    L.control.attribution({ position: 'bottomleft', prefix: 'EY // OSM' }).addTo(map);

    return map;
  }

  // ── Marker creators ────────────────────────────────────
  function createEarthquakeMarker(event) {
    const mag = event.magnitude || 0;
    const sev = event.severity;
    const radius = Math.max(8, mag * 4);
    const color = sev.color;

    const icon = L.divIcon({
      html: `
        <div class="eq-marker" style="--color:${color};--radius:${radius}px">
          <div class="eq-pulse"></div>
          <div class="eq-core">
            <span class="eq-mag">${mag.toFixed(1)}</span>
          </div>
        </div>`,
      className: '',
      iconSize: [radius * 2 + 20, radius * 2 + 20],
      iconAnchor: [radius + 10, radius + 10],
    });

    const marker = L.marker([event.lat, event.lon], { icon });

    // Ripple circle
    const circle = L.circle([event.lat, event.lon], {
      radius: mag * 50000, // km
      color,
      fillColor: color,
      fillOpacity: 0.05,
      weight: 1,
      opacity: 0.4,
      dashArray: '4 4',
    });

    return { marker, extra: [circle] };
  }

  function createMissileMarker(event) {
    const icon = L.divIcon({
      html: `
        <div class="missile-marker">
          <div class="missile-pulse"></div>
          <div class="missile-core">🚀</div>
        </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([event.lat, event.lon], { icon });
    const layers = [marker];

    // Trajectory line
    if (event.targetLat && event.targetLon) {
      const trajectory = L.polyline(
        [[event.lat, event.lon], [event.targetLat, event.targetLon]],
        {
          color: '#FF1744',
          weight: 1.5,
          opacity: 0.7,
          dashArray: '6 6',
          className: 'trajectory-line',
        }
      );

      // Impact zone
      const impactZone = L.circle([event.targetLat, event.targetLon], {
        radius: 15000,
        color: '#FF1744',
        fillColor: '#FF1744',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.5,
        dashArray: '3 3',
      });

      // Target marker
      const targetIcon = L.divIcon({
        html: `<div class="target-marker"></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const targetMarker = L.marker([event.targetLat, event.targetLon], { icon: targetIcon });

      layers.push(trajectory, impactZone, targetMarker);
    }

    return { marker, extra: layers.slice(1) };
  }

  function createDroneMarker(event) {
    const icon = L.divIcon({
      html: `
        <div class="drone-marker">
          <div class="drone-pulse"></div>
          <div class="drone-core">✈</div>
        </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([event.lat, event.lon], { icon });
    const layers = [];

    if (event.targetLat && event.targetLon) {
      const trajectory = L.polyline(
        [[event.lat, event.lon], [event.targetLat, event.targetLon]],
        {
          color: '#FF6D00',
          weight: 1,
          opacity: 0.5,
          dashArray: '4 8',
        }
      );
      layers.push(trajectory);
    }

    return { marker, extra: layers };
  }

  function createTsunamiMarker(event) {
    const icon = L.divIcon({
      html: `
        <div class="tsunami-marker">
          <div class="tsunami-pulse"></div>
          <div class="tsunami-core">🌊</div>
        </div>`,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker([event.lat, event.lon], { icon });

    const wave = L.circle([event.lat, event.lon], {
      radius: 300000,
      color: '#00B0FF',
      fillColor: '#00B0FF',
      fillOpacity: 0.04,
      weight: 1,
      opacity: 0.3,
      dashArray: '5 5',
    });

    return { marker, extra: [wave] };
  }

  function createNuclearMarker(event) {
    const icon = L.divIcon({
      html: `
        <div class="nuclear-marker">
          <div class="nuclear-spin">☢</div>
        </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([event.lat, event.lon], { icon });

    const blast = L.circle([event.lat, event.lon], {
      radius: 5000, color: '#FF1744', fillColor: '#FF1744', fillOpacity: 0.12, weight: 1, opacity: 0.5
    });
    const thermal = L.circle([event.lat, event.lon], {
      radius: 15000, color: '#FF6D00', fillColor: '#FF6D00', fillOpacity: 0.06, weight: 1, opacity: 0.4
    });
    const radiation = L.circle([event.lat, event.lon], {
      radius: 50000, color: '#FFD600', fillColor: '#FFD600', fillOpacity: 0.03, weight: 1, opacity: 0.3
    });

    return { marker, extra: [blast, thermal, radiation] };
  }

  function createGenericMarker(event, emoji, color) {
    const icon = L.divIcon({
      html: `
        <div class="generic-marker" style="--color:${color}">
          <div class="generic-pulse"></div>
          <div class="generic-core">${emoji}</div>
        </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([event.lat, event.lon], { icon });

    const zone = L.circle([event.lat, event.lon], {
      radius: 80000,
      color,
      fillColor: color,
      fillOpacity: 0.04,
      weight: 1,
      opacity: 0.3,
    });

    return { marker, extra: [zone] };
  }

  // ── Popup builder ──────────────────────────────────────
  function buildPopup(event) {
    const timeStr = event.time.toUTCString();
    const relTime = getRelativeTime(event.time);
    const icon = CONFIG.threatIcons[event.type] || '⚠';
    const color = CONFIG.threatColors[event.type] || '#FFD600';
    const sevLabel = event.severity?.label || 'N/A';
    const sevColor = event.severity?.color || '#FFD600';

    let distanceHtml = '';
    if (userLat !== null && userLon !== null) {
      const dist = getDistance(userLat, userLon, event.lat, event.lon);
      distanceHtml = `<div class="popup-row"><span class="popup-label">DISTANCIA</span><span class="popup-val">${dist.toFixed(0)} km</span></div>`;
    }

    let extraHtml = '';
    if (event.magnitude) {
      extraHtml += `<div class="popup-row"><span class="popup-label">MAGNITUD</span><span class="popup-val" style="color:${color}">M${event.magnitude.toFixed(1)}</span></div>`;
    }
    if (event.weapon) {
      extraHtml += `<div class="popup-row"><span class="popup-label">SISTEMA</span><span class="popup-val">${event.weapon.name}</span></div>`;
      extraHtml += `<div class="popup-row"><span class="popup-label">ALCANCE</span><span class="popup-val">${event.weapon.range} km</span></div>`;
    }
    if (event.status) {
      extraHtml += `<div class="popup-row"><span class="popup-label">ESTADO</span><span class="popup-val" style="color:${event.isIntercepted ? '#00E676' : '#FF1744'}">${event.status}</span></div>`;
    }
    if (event.launchSite) {
      extraHtml += `<div class="popup-row"><span class="popup-label">ORIGEN</span><span class="popup-val">${event.launchSite}</span></div>`;
    }
    if (event.targetSite) {
      extraHtml += `<div class="popup-row"><span class="popup-label">OBJETIVO</span><span class="popup-val" style="color:#FF1744">${event.targetSite}</span></div>`;
    }

    return `
      <div class="ey-popup">
        <div class="popup-header">
          <span class="popup-icon" style="color:${color}">${icon}</span>
          <span class="popup-type" style="color:${color}">${event.type.toUpperCase()}</span>
          <span class="popup-sev" style="background:${sevColor}20;color:${sevColor};border-color:${sevColor}40">${sevLabel}</span>
        </div>
        <div class="popup-title">${event.shortTitle || event.title}</div>
        <div class="popup-grid">
          <div class="popup-row"><span class="popup-label">LAT/LON</span><span class="popup-val">${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}</span></div>
          <div class="popup-row"><span class="popup-label">UTC</span><span class="popup-val">${timeStr}</span></div>
          <div class="popup-row"><span class="popup-label">TIEMPO</span><span class="popup-val">${relTime}</span></div>
          <div class="popup-row"><span class="popup-label">FUENTE</span><span class="popup-val">${event.source}</span></div>
          ${extraHtml}
          ${distanceHtml}
        </div>
        ${event.simulated ? '<div class="popup-sim">⚠ DATOS SIMULADOS / ENTRENAMIENTO</div>' : ''}
      </div>`;
  }

  // ── Add/remove events ──────────────────────────────────
  function addEvent(event) {
    if (markersMap.has(event.id)) return;
    if (!event.lat || !event.lon || isNaN(event.lat) || isNaN(event.lon)) return;

    let markerData;
    switch (event.type) {
      case 'earthquake': markerData = createEarthquakeMarker(event); break;
      case 'missile': markerData = createMissileMarker(event); break;
      case 'drone': markerData = createDroneMarker(event); break;
      case 'tsunami': markerData = createTsunamiMarker(event); break;
      case 'nuclear': markerData = createNuclearMarker(event); break;
      case 'fire': markerData = createGenericMarker(event, '🔥', CONFIG.threatColors.fire); break;
      case 'flood': markerData = createGenericMarker(event, '💧', CONFIG.threatColors.flood); break;
      case 'storm': markerData = createGenericMarker(event, '⚡', CONFIG.threatColors.storm); break;
      default: markerData = createGenericMarker(event, '⚠', '#FFD600');
    }

    const { marker, extra } = markerData;

    // Tooltip
    marker.bindTooltip(
      `<div class="ey-tooltip"><span>${CONFIG.threatIcons[event.type] || '⚠'}</span> ${event.shortTitle || event.title}</div>`,
      { permanent: false, direction: 'top', className: 'ey-tooltip-wrap', offset: [0, -10] }
    );

    // Popup
    marker.bindPopup(buildPopup(event), {
      className: 'ey-popup-wrap',
      maxWidth: 320,
      minWidth: 280,
    });

    // Click flies to event
    marker.on('click', () => {
      document.dispatchEvent(new CustomEvent('event-click', { detail: event }));
    });

    // Add to cluster or map
    const visible = activeFilters.has(event.type);
    const layers = [marker, ...extra];

    if (visible) {
      if (markerClusterGroup) {
        markerClusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }
      extra.forEach(l => l.addTo(map));
    }

    markersMap.set(event.id, { marker, extra, event, visible });
  }

  function removeEvent(id) {
    const data = markersMap.get(id);
    if (!data) return;
    if (markerClusterGroup) {
      markerClusterGroup.removeLayer(data.marker);
    } else {
      map.removeLayer(data.marker);
    }
    data.extra.forEach(l => map.removeLayer(l));
    markersMap.delete(id);
  }

  function clearAll() {
    markersMap.forEach((_, id) => removeEvent(id));
  }

  // ── Filter ─────────────────────────────────────────────
  function setFilter(type, enabled) {
    if (enabled) activeFilters.add(type);
    else activeFilters.delete(type);

    markersMap.forEach((data) => {
      if (data.event.type !== type) return;
      const shouldShow = activeFilters.has(type);
      if (shouldShow && !data.visible) {
        if (markerClusterGroup) markerClusterGroup.addLayer(data.marker);
        else data.marker.addTo(map);
        data.extra.forEach(l => l.addTo(map));
        data.visible = true;
      } else if (!shouldShow && data.visible) {
        if (markerClusterGroup) markerClusterGroup.removeLayer(data.marker);
        else map.removeLayer(data.marker);
        data.extra.forEach(l => map.removeLayer(l));
        data.visible = false;
      }
    });
  }

  // ── User location ──────────────────────────────────────
  function setUserLocation(lat, lon) {
    userLat = lat;
    userLon = lon;

    if (userMarker) map.removeLayer(userMarker);

    const icon = L.divIcon({
      html: `<div class="user-marker"><div class="user-pulse"></div><div class="user-core">◉</div></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    userMarker = L.marker([lat, lon], { icon, zIndexOffset: 9999 });
    userMarker.bindTooltip('<div class="ey-tooltip">📍 TU UBICACIÓN</div>', {
      permanent: true, direction: 'top', className: 'ey-tooltip-wrap', offset: [0, -14]
    });
    userMarker.addTo(map);
  }

  function flyToUser() {
    if (userLat !== null) map.flyTo([userLat, userLon], 8, { duration: 1.5 });
  }

  function flyTo(lat, lon, zoom = 7) {
    map.flyTo([lat, lon], zoom, { duration: 1.2 });
  }

  // ── Helpers ────────────────────────────────────────────
  function getRelativeTime(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'hace menos de 1 min';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
    return `hace ${Math.floor(diff / 86400000)}d`;
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function openPopup(eventId) {
    const data = markersMap.get(eventId);
    if (data) {
      flyTo(data.event.lat, data.event.lon);
      setTimeout(() => data.marker.openPopup(), 800);
    }
  }

  function getMarkerCount() {
    return markersMap.size;
  }

  return {
    init, addEvent, removeEvent, clearAll,
    setFilter, setUserLocation, flyToUser, flyTo, openPopup,
    getMarkerCount,
    get map() { return map; },
  };
})();
