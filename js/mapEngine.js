/* ═══════════════════════════════════════
   GES — mapEngine.js
   Leaflet dark map, missile markers,
   trajectories, popups
   ═══════════════════════════════════════ */

const MapEngine = (() => {
  let map = null;
  let clusterGroup = null;
  let layerMap = new Map(); // eventId → { marker, lines[], circles[] }
  let activeLayerFilter = 'all';
  let userMarker = null;

  const TYPE_COLORS = {
    ballistic:  '#FF2040',
    cruise:     '#FF8C00',
    hypersonic: '#00F5D4',
    drone:      '#F5E642',
    'anti-ship':'#0080FF',
  };

  function init(containerId) {
    map = L.map(containerId, {
      center: [25, 15],
      zoom: 2,
      minZoom: 2, maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM',
      className: '', // handled by CSS tile-pane filter
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ prefix: 'GES · OSM', position: 'bottomleft' }).addTo(map);

    // Cluster group
    if (typeof L.markerClusterGroup === 'function') {
      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="ges-cluster-icon"><span>${count}</span></div>`,
            className: '',
            iconSize: [40, 40],
          });
        },
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
      });
      map.addLayer(clusterGroup);
    }

    // Map move events → update HUD
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(3);
      const lon = e.latlng.lng.toFixed(3);
      const latEl = document.getElementById('map-lat');
      const lonEl = document.getElementById('map-lon');
      if (latEl) latEl.textContent = `LAT ${lat}°`;
      if (lonEl) lonEl.textContent = `LON ${lon}°`;
    });
    map.on('zoomend', () => {
      const zEl = document.getElementById('map-zoom');
      if (zEl) zEl.textContent = `Z:${map.getZoom()}`;
    });

    return map;
  }

  // ── Create marker HTML ─────────────────────────────────
  function makeMarkerIcon(event) {
    const status = event.status;
    const type = event.type;
    const color = TYPE_COLORS[type] || '#FF8C00';
    const emoji = type === 'ballistic' ? '⬆' :
                  type === 'hypersonic' ? '⚡' :
                  type === 'cruise' ? '➡' :
                  type === 'drone' ? '◎' : '🎯';

    const statusClass = status === 'intercepted' ? 'm-marker-intercepted' : '';

    return L.divIcon({
      html: `
        <div class="m-marker-${type} ${statusClass}">
          <div class="m-ring"></div>
          ${type === 'ballistic' || type === 'hypersonic' ? '<div class="m-ring m-ring2"></div>' : ''}
          <div class="m-core" style="--mc:${color}">${emoji}</div>
        </div>`,
      className: '',
      iconSize: type === 'ballistic' ? [32,32] : type === 'hypersonic' ? [30,30] : [28,28],
      iconAnchor: type === 'ballistic' ? [16,16] : type === 'hypersonic' ? [15,15] : [14,14],
    });
  }

  function makeTargetIcon() {
    return L.divIcon({
      html: `<div class="m-target"></div>`,
      className: '',
      iconSize: [18,18],
      iconAnchor: [9,9],
    });
  }

  // ── Popup HTML ─────────────────────────────────────────
  function buildPopup(event) {
    const color = TYPE_COLORS[event.type] || '#FF8C00';
    const sys = event.system;
    const etaStr = Simulator.formatETA(event);
    const timeStr = event.time.toISOString().replace('T',' ').substr(0,19) + ' UTC';

    return `
      <div class="ges-popup-content">
        <div class="gpc-type-bar" style="background:${color}; box-shadow: 0 0 8px ${color}55"></div>
        <div class="gpc-name">${sys.name}</div>
        <div class="gpc-rows">
          <div class="gpc-row"><span class="gpc-label">TIPO</span>
            <span class="gpc-val accent">${event.type.toUpperCase()}</span></div>
          <div class="gpc-row"><span class="gpc-label">ORIGEN</span>
            <span class="gpc-val">${event.launchSite}</span></div>
          <div class="gpc-row"><span class="gpc-label">OBJETIVO</span>
            <span class="gpc-val danger">${event.targetSite}</span></div>
          <div class="gpc-row"><span class="gpc-label">DISTANCIA</span>
            <span class="gpc-val">${event.distKm} km</span></div>
          <div class="gpc-row"><span class="gpc-label">VELOCIDAD</span>
            <span class="gpc-val">Mach ${sys.speedMach}</span></div>
          <div class="gpc-row"><span class="gpc-label">ETA</span>
            <span class="gpc-val ${event.status === 'intercepted' ? 'safe' : event.status === 'impact' ? 'danger' : 'accent'}">${etaStr}</span></div>
          <div class="gpc-row"><span class="gpc-label">ESTADO</span>
            <span class="gpc-val ${event.status === 'intercepted' ? 'safe' : event.status === 'impact' ? 'danger' : 'accent'}">${event.status.toUpperCase()}</span></div>
          <div class="gpc-row"><span class="gpc-label">ALCANCE SYS</span>
            <span class="gpc-val">${sys.range} km</span></div>
          <div class="gpc-row"><span class="gpc-label">CEP</span>
            <span class="gpc-val">${sys.CEP} m</span></div>
          <div class="gpc-row"><span class="gpc-label">ID</span>
            <span class="gpc-val">${event.id}</span></div>
          <div class="gpc-row"><span class="gpc-label">HORA</span>
            <span class="gpc-val">${timeStr}</span></div>
        </div>
      </div>`;
  }

  // ── Tooltip ────────────────────────────────────────────
  function buildTooltip(event) {
    const sys = event.system;
    const eta = Simulator.formatETA(event);
    return `<strong>${sys.name}</strong> · ${event.launchSite} → ${event.targetSite} · ETA ${eta}`;
  }

  // ── Add event to map ───────────────────────────────────
  function addEvent(event) {
    if (layerMap.has(event.id)) return;
    if (!event.launchLat || isNaN(event.launchLat)) return;

    const color = TYPE_COLORS[event.type] || '#FF8C00';
    const icon = makeMarkerIcon(event);
    const marker = L.marker([event.launchLat, event.launchLon], { icon });

    marker.bindTooltip(buildTooltip(event), {
      className: 'ges-tip',
      direction: 'top',
      offset: [0, -14],
    });

    marker.bindPopup(buildPopup(event), {
      className: 'ges-popup',
      maxWidth: 300,
      autoPanPaddingTopLeft: [60, 60],
    });

    marker.on('click', () => {
      document.dispatchEvent(new CustomEvent('ges:marker-click', { detail: event }));
    });

    // Update popup on each open (ETA changes)
    marker.on('popupopen', () => {
      marker.setPopupContent(buildPopup(event));
    });

    const extras = [];

    // Trajectory line
    if (event.targetLat && event.targetLon) {
      const line = L.polyline(
        [[event.launchLat, event.launchLon], [event.targetLat, event.targetLon]],
        {
          color,
          weight: 1.5,
          opacity: 0.6,
          dashArray: event.type === 'ballistic' ? '8 5' : '5 8',
          className: 'traj-line',
        }
      );
      line.addTo(map);
      extras.push(line);

      // Target icon
      const tgtMarker = L.marker([event.targetLat, event.targetLon], {
        icon: makeTargetIcon(),
        interactive: false,
      });
      tgtMarker.addTo(map);
      extras.push(tgtMarker);

      // Impact zone circle
      const impactCircle = L.circle([event.targetLat, event.targetLon], {
        radius: 20000,
        color,
        fillColor: color,
        fillOpacity: 0.05,
        weight: 1,
        opacity: 0.3,
        dashArray: '5 4',
        className: 'm-impact-zone',
      });
      impactCircle.addTo(map);
      extras.push(impactCircle);
    }

    // Add to cluster or map
    const visible = shouldShow(event);
    if (visible) {
      if (clusterGroup) clusterGroup.addLayer(marker);
      else marker.addTo(map);
    }

    layerMap.set(event.id, { marker, extras, visible, event });
  }

  function removeEvent(id) {
    const d = layerMap.get(id);
    if (!d) return;
    if (clusterGroup) clusterGroup.removeLayer(d.marker);
    else map.removeLayer(d.marker);
    d.extras.forEach(l => map.removeLayer(l));
    layerMap.delete(id);
  }

  function updateEvent(event) {
    const d = layerMap.get(event.id);
    if (!d) return;
    // Refresh icon for status changes
    d.marker.setIcon(makeMarkerIcon(event));
  }

  function shouldShow(event) {
    if (activeLayerFilter === 'all') return true;
    return event.type === activeLayerFilter;
  }

  function setLayerFilter(filter) {
    activeLayerFilter = filter;
    layerMap.forEach((data, id) => {
      const show = shouldShow(data.event);
      if (show && !data.visible) {
        if (clusterGroup) clusterGroup.addLayer(data.marker);
        else data.marker.addTo(map);
        data.visible = true;
      } else if (!show && data.visible) {
        if (clusterGroup) clusterGroup.removeLayer(data.marker);
        else map.removeLayer(data.marker);
        data.visible = false;
      }
    });
  }

  function clearAll() {
    layerMap.forEach((_, id) => removeEvent(id));
  }

  function flyTo(lat, lon, zoom = 7) {
    map?.flyTo([lat, lon], zoom, { duration: 1.2 });
  }

  function openPopup(eventId) {
    const d = layerMap.get(eventId);
    if (d) {
      flyTo(d.event.launchLat, d.event.launchLon, 6);
      setTimeout(() => d.marker.openPopup(), 900);
    }
  }

  function addUserLocation(lat, lon) {
    if (userMarker) map.removeLayer(userMarker);
    const icon = L.divIcon({
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:rgba(57,255,20,0.2);
        border:2px solid #39FF14;
        box-shadow:0 0 12px #39FF14;
      "></div>`,
      className: '',
      iconSize: [16,16],
      iconAnchor: [8,8],
    });
    userMarker = L.marker([lat, lon], { icon })
      .bindTooltip('TU POSICIÓN', { className: 'ges-tip', direction: 'top' })
      .addTo(map);
  }

  return {
    init, addEvent, removeEvent, updateEvent, clearAll,
    setLayerFilter, flyTo, openPopup, addUserLocation,
    get map() { return map; },
  };
})();
