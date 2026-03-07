/* ═══════════════════════════════════════
   GES — pages.js
   Render all page content:
   feed, tracker table, arsenal, alerts
   ═══════════════════════════════════════ */

const Pages = (() => {

  let currentPage = 'dashboard';
  let trackerFilter = 'all';
  let arsenalSearch = '';
  let arsenalCountry = 'all';
  let arsenalTypeFilter = 'all';
  let alertFilter = 'all';
  let selectedEventId = null;
  let selectedAlertId = null;

  // ── Navigation ─────────────────────────────────────────
  function initNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        navigateTo(page);
      });
    });
  }

  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });
    // Re-render page-specific content
    if (page === 'tracker') renderTracker();
    if (page === 'arsenal') renderArsenal();
    if (page === 'intel') renderIntel();
    if (page === 'alerts') renderAlerts();
  }

  // ── FEED (dashboard) ───────────────────────────────────
  function addFeedItem(event, isNew = false) {
    const container = document.getElementById('main-feed');
    if (!container) return;

    const emptyEl = container.querySelector('.feed-empty');
    if (emptyEl) emptyEl.remove();

    const color = { ballistic:'#FF2040', cruise:'#FF8C00', hypersonic:'#00F5D4', drone:'#F5E642' }[event.type] || '#FF8C00';
    const typeLabel = event.type.toUpperCase();
    const timeStr = getRelTime(event.time);
    const eta = Simulator.formatETA(event);
    const sevColor = event.severity.color;

    const el = document.createElement('div');
    el.className = `feed-item${isNew ? ' new-event feed-item-enter' : ''}`;
    el.dataset.id = event.id;
    el.style.setProperty('--type-color', color);

    el.innerHTML = `
      <div class="fi-icon" style="background:${color}15;color:${color}">${
        event.type === 'ballistic' ? '⬆' :
        event.type === 'hypersonic' ? '⚡' :
        event.type === 'cruise' ? '➡' : '◎'
      }</div>
      <div class="fi-body">
        <div class="fi-title">${event.system.name}</div>
        <div class="fi-meta">
          <span class="fi-origin">${event.launchSite}</span>
          <span>→</span>
          <span>${event.targetSite}</span>
          <span class="type-badge ${event.type}">${typeLabel}</span>
        </div>
      </div>
      <div class="fi-right">
        <span class="status-badge ${event.status}">${event.status.toUpperCase()}</span>
        <span class="fi-time" style="color:${sevColor}">${eta !== '--:--' ? 'ETA '+eta : timeStr}</span>
      </div>`;

    el.addEventListener('click', () => {
      document.querySelectorAll('.feed-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      MapEngine.openPopup(event.id);
      document.dispatchEvent(new CustomEvent('ges:feed-click', { detail: event }));
    });

    if (isNew) {
      container.insertBefore(el, container.firstChild);
      // Flash
      setTimeout(() => el.classList.remove('new-event'), 700);
    } else {
      container.appendChild(el);
    }

    // Trim
    while (container.children.length > 60) {
      container.removeChild(container.lastChild);
    }
  }

  // ── TRACKER TABLE ──────────────────────────────────────
  function renderTracker() {
    const tbody = document.getElementById('tracker-tbody');
    if (!tbody) return;

    const events = Simulator.getEvents(trackerFilter);
    const rows = [...events].sort((a,b) => b.time - a.time).slice(0, 100);

    tbody.innerHTML = rows.map((evt, i) => {
      const color = { ballistic:'#FF2040', cruise:'#FF8C00', hypersonic:'#00F5D4', drone:'#F5E642' }[evt.type] || '#FF8C00';
      const eta = Simulator.formatETA(evt);
      const crit = evt.severity === SEV.CRITICAL ? ' row-critical' : '';
      const selected = evt.id === selectedEventId ? ' selected' : '';

      return `
        <tr class="row-enter${crit}${selected}" data-id="${evt.id}" style="animation-delay:${Math.min(i*0.03,0.8)}s">
          <td class="cell-id">${evt.id}</td>
          <td><span class="type-badge ${evt.type}">${evt.type.toUpperCase()}</span></td>
          <td class="cell-system">${evt.system.name}</td>
          <td>${evt.launchSite}</td>
          <td style="color:#FF6060">${evt.targetSite}</td>
          <td><span class="status-badge ${evt.status}">${evt.status.toUpperCase()}</span></td>
          <td class="cell-speed">Mach ${evt.system.speedMach}</td>
          <td class="cell-alt">${(evt.system.altitude/1000).toFixed(0)} km</td>
          <td class="cell-eta">${eta}</td>
          <td style="color:rgba(255,255,255,0.35);font-size:10px">${getRelTime(evt.time)}</td>
        </tr>`;
    }).join('');

    // Row click → detail
    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        selectedEventId = id;
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const evt = events.find(e => e.id === id);
        if (evt) renderTrackerDetail(evt);
        MapEngine.openPopup(id);
      });
    });
  }

  function renderTrackerDetail(evt) {
    const el = document.getElementById('tracker-detail');
    if (!el) return;

    const sys = evt.system;
    const color = { ballistic:'#FF2040', cruise:'#FF8C00', hypersonic:'#00F5D4', drone:'#F5E642' }[evt.type] || '#FF8C00';
    const eta = Simulator.formatETA(evt);

    el.innerHTML = `
      <div class="detail-header">
        <div style="margin-bottom:8px"><span class="type-badge ${evt.type}" style="font-size:12px">${evt.type.toUpperCase()}</span></div>
        <div class="detail-title">${sys.name}</div>
        <div class="detail-sub">${sys.natoCode || 'Sin designación OTAN'} · ${evt.id}</div>
      </div>

      <div style="margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:2px">
        <div style="font-family:'Teko',sans-serif;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-bottom:6px">TRAYECTORIA</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,0.5);line-height:1.8">${evt.description}</div>
      </div>

      <div class="detail-grid">
        <div class="dg-item"><div class="dgi-label">ORIGEN</div><div class="dgi-val hi">${evt.launchSite}</div></div>
        <div class="dg-item"><div class="dgi-label">OBJETIVO</div><div class="dgi-val danger">${evt.targetSite}</div></div>
        <div class="dg-item"><div class="dgi-label">DISTANCIA</div><div class="dgi-val">${evt.distKm} km</div></div>
        <div class="dg-item"><div class="dgi-label">ETA</div><div class="dgi-val" style="color:${color};font-family:'Bebas Neue',sans-serif;font-size:20px">${eta}</div></div>
        <div class="dg-item"><div class="dgi-label">VELOCIDAD</div><div class="dgi-val">Mach ${sys.speedMach} (${sys.speed.toLocaleString()} m/s)</div></div>
        <div class="dg-item"><div class="dgi-label">ALTITUD MÁX</div><div class="dgi-val">${(sys.altitude/1000).toFixed(0)} km</div></div>
        <div class="dg-item"><div class="dgi-label">CEP</div><div class="dgi-val">${sys.CEP} m</div></div>
        <div class="dg-item"><div class="dgi-label">OGIVA</div><div class="dgi-val">${sys.warhead}</div></div>
        <div class="dg-item"><div class="dgi-label">PLATAFORMAS</div><div class="dgi-val">${sys.launchPlatform.join(', ')}</div></div>
        <div class="dg-item"><div class="dgi-label">GUÍA</div><div class="dgi-val">${sys.guidance}</div></div>
      </div>

      ${evt.isIntercepted ? `
        <div style="padding:10px 12px;background:rgba(57,255,20,0.07);border:1px solid rgba(57,255,20,0.2);border-radius:2px;margin-top:8px">
          <div style="font-family:'Teko',sans-serif;font-size:11px;color:#39FF14;letter-spacing:2px">✓ INTERCEPTADO</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px">Sistema: ${evt.interceptBattery}</div>
        </div>` : ''
      }

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)">
        <div style="font-family:'Teko',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,0.25);margin-bottom:6px">ANÁLISIS DE INTELIGENCIA</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);line-height:1.8">${sys.uses}</div>
      </div>`;
  }

  // ── ARSENAL ────────────────────────────────────────────
  function renderArsenal() {
    const grid = document.getElementById('arsenal-grid');
    if (!grid) return;

    const filtered = MISSILE_DB.filter(sys => {
      const matchSearch = !arsenalSearch ||
        sys.name.toLowerCase().includes(arsenalSearch) ||
        sys.natoCode?.toLowerCase().includes(arsenalSearch) ||
        sys.country.includes(arsenalSearch);
      const matchCountry = arsenalCountry === 'all' || sys.country === arsenalCountry;
      const matchType = arsenalTypeFilter === 'all' || sys.type === arsenalTypeFilter;
      return matchSearch && matchCountry && matchType;
    });

    const countryColors = {
      russia: '#FF2040', usa: '#0080FF', china: '#F5E642',
      nkorea: '#FF0080', iran: '#FF8C00', israel: '#39FF14',
    };
    const countryNames = {
      russia: 'RUSIA', usa: 'EE.UU.', china: 'CHINA',
      nkorea: 'COREA DEL NORTE', iran: 'IRÁN', israel: 'ISRAEL',
    };

    grid.innerHTML = filtered.map((sys, i) => {
      const color = countryColors[sys.country] || '#FF8C00';
      return `
        <div class="arsenal-card" style="--card-color:${color};animation-delay:${Math.min(i*0.04,1.2)}s" data-id="${sys.id}">
          <div class="ac-header">
            <div>
              <div class="ac-name">${sys.name}</div>
              <div class="ac-nato">${sys.natoCode || '—'}</div>
            </div>
            <div>
              <div class="ac-country" style="color:${color}">${sys.flag} ${countryNames[sys.country] || sys.country.toUpperCase()}</div>
              <div style="text-align:right;margin-top:4px"><span class="type-badge ${sys.type}">${sys.type.toUpperCase()}</span></div>
            </div>
          </div>

          <div class="ac-specs">
            <div class="ac-spec"><div class="acs-label">ALCANCE</div><div class="acs-val">${sys.range.toLocaleString()} km</div></div>
            <div class="ac-spec"><div class="acs-label">VELOCIDAD</div><div class="acs-val">Mach ${sys.speedMach}</div></div>
            <div class="ac-spec"><div class="acs-label">CEP</div><div class="acs-val">${sys.CEP} m</div></div>
            <div class="ac-spec"><div class="acs-label">SERVICIO</div><div class="acs-val">${sys.inService}</div></div>
            <div class="ac-spec" style="grid-column:1/-1"><div class="acs-label">OGIVA</div><div class="acs-val">${sys.warhead}</div></div>
          </div>

          <div class="ac-tags">
            ${sys.tags.map(t => `<span class="ac-tag">${t}</span>`).join('')}
          </div>
        </div>`;
    }).join('');

    // Click → modal
    grid.querySelectorAll('.arsenal-card').forEach(card => {
      card.addEventListener('click', () => {
        const sys = MISSILE_DB.find(m => m.id === card.dataset.id);
        if (sys) showArsenalModal(sys);
      });
    });
  }

  function showArsenalModal(sys) {
    const color = { russia:'#FF2040', usa:'#0080FF', china:'#F5E642', nkorea:'#FF0080', iran:'#FF8C00', israel:'#39FF14' }[sys.country] || '#FF8C00';

    document.getElementById('modal-content').innerHTML = `
      <div style="border-bottom:2px solid ${color};margin-bottom:18px;padding-bottom:14px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:3px;color:#fff;line-height:1">${sys.name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">${sys.natoCode || '— Sin designación OTAN'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:30px">${sys.flag}</div>
            <span class="type-badge ${sys.type}">${sys.type.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
        ${[
          ['ALCANCE', `${sys.range.toLocaleString()} km`],
          ['VELOCIDAD', `Mach ${sys.speedMach} (${sys.speed} m/s)`],
          ['ALTITUD', `${(sys.altitude/1000).toFixed(0)} km`],
          ['CEP', `${sys.CEP} m`],
          ['LONGITUD', `${sys.length} m`],
          ['DIÁMETRO', `${sys.diameter} m`],
          ['EN SERVICIO', `${sys.inService}`],
        ].map(([l,v]) => `
          <div><div class="dgi-label">${l}</div><div class="dgi-val">${v}</div></div>
        `).join('')}
        <div style="grid-column:1/-1"><div class="dgi-label">OGIVA</div><div class="dgi-val">${sys.warhead}</div></div>
        <div style="grid-column:1/-1"><div class="dgi-label">GUÍA</div><div class="dgi-val">${sys.guidance}</div></div>
        <div style="grid-column:1/-1"><div class="dgi-label">PLATAFORMAS DE LANZAMIENTO</div><div class="dgi-val">${sys.launchPlatform.join(' · ')}</div></div>
      </div>

      <div style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:2px">
        <div class="dgi-label" style="margin-bottom:8px">ANÁLISIS OPERACIONAL</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,0.55);line-height:1.9">${sys.uses}</div>
      </div>

      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        ${sys.tags.map(t => `<span class="ac-tag">${t}</span>`).join('')}
      </div>`;

    document.getElementById('modal-overlay').classList.add('open');
  }

  // ── INTEL ──────────────────────────────────────────────
  function renderIntel() {
    const stats = Simulator.getStats();
    Charts.buildZoneBars(stats);
    Charts.buildSystemFrequency(stats);
    Charts.buildInterceptStats(stats);
    Charts.buildCountryAnalysis(stats);
    Charts.drawActivityChart();
  }

  // ── ALERTS ────────────────────────────────────────────
  function renderAlerts() {
    const list = document.getElementById('alerts-list');
    if (!list) return;

    const alerts = Simulator.getAlerts(alertFilter);

    list.innerHTML = alerts.slice(0, 80).map((a, i) => {
      const selected = a.id === selectedAlertId ? ' selected' : '';
      return `
        <div class="alert-item${selected}" data-id="${a.id}"
          style="--sev-color:${a.severity.color};animation-delay:${Math.min(i*0.03,0.8)}s">
          <div class="ai-sev-dot"></div>
          <div class="ai-body">
            <div class="ai-title">${a.title}</div>
            <div class="ai-sub">${a.sub}</div>
          </div>
          <div class="ai-right">
            <div class="ai-time">${getRelTime(a.time)}</div>
            <div class="ai-sev-label">${a.severity.label}</div>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.alert-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        selectedAlertId = id;
        list.querySelectorAll('.alert-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const alert = alerts.find(a => a.id === id);
        if (alert) renderAlertDetail(alert);
      });
    });

    // Update badge
    document.getElementById('nav-alert-count').textContent = alerts.length;
  }

  function renderAlertDetail(alert) {
    const el = document.getElementById('alerts-detail');
    if (!el) return;
    const evt = alert.event;
    el.innerHTML = `
      <div style="border-left:3px solid ${alert.severity.color};padding-left:14px;margin-bottom:16px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:18px;color:#fff;line-height:1.2">${alert.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);margin-top:6px">${alert.sub}</div>
      </div>

      <div style="margin-bottom:14px">
        <span class="status-badge ${evt.status}">${evt.status.toUpperCase()}</span>
        <span style="margin-left:8px;font-family:'Teko',sans-serif;font-size:13px;letter-spacing:2px;color:${alert.severity.color}">${alert.severity.label}</span>
      </div>

      <div class="detail-grid">
        <div class="dg-item"><div class="dgi-label">SISTEMA</div><div class="dgi-val">${evt.system.name}</div></div>
        <div class="dg-item"><div class="dgi-label">TIPO</div><div class="dgi-val">${evt.type.toUpperCase()}</div></div>
        <div class="dg-item"><div class="dgi-label">ZONA</div><div class="dgi-val">${evt.zoneName}</div></div>
        <div class="dg-item"><div class="dgi-label">DISTANCIA</div><div class="dgi-val">${evt.distKm} km</div></div>
        <div class="dg-item"><div class="dgi-label">ETA ORIG.</div><div class="dgi-val">${evt.eta.label}</div></div>
        <div class="dg-item"><div class="dgi-label">ID EVENTO</div><div class="dgi-val">${evt.id}</div></div>
      </div>`;
  }

  // ── Ticker bar ──────────────────────────────────────────
  function buildTicker(events) {
    const el = document.getElementById('ticker-bar');
    if (!el) return;
    const items = events.slice(0, 20);
    const html = [...items, ...items].map(evt => {
      const color = { ballistic:'#FF2040', cruise:'#FF8C00', hypersonic:'#00F5D4', drone:'#F5E642' }[evt.type] || '#FF8C00';
      return `
        <div class="ticker-item">
          <span class="ti-type" style="color:${color}">${evt.system.name}</span>
          <span>${evt.launchSite}</span>
          <span class="ti-sep">→</span>
          <span>${evt.targetSite}</span>
          <span style="color:rgba(255,255,255,0.2)">·</span>
          <span style="color:${evt.severity.color}">${evt.severity.label}</span>
        </div>`;
    }).join('');
    el.innerHTML = html;
  }

  // ── Alert flash ────────────────────────────────────────
  function showAlertFlash(event) {
    if (event.severity.order < 3) return; // Only HIGH+
    const flashEl = document.getElementById('alert-flash');
    const textEl = document.getElementById('af-text');
    const subEl = document.getElementById('af-sub');
    if (!flashEl) return;

    textEl.textContent = `${event.type.toUpperCase()}: ${event.system.name}`;
    subEl.textContent = `${event.launchSite} → ${event.targetSite} · ETA ${event.eta.label}`;

    flashEl.classList.add('show');
    setTimeout(() => flashEl.classList.remove('show'), 5000);

    // Browser notification
    if (Notification.permission === 'granted') {
      try {
        new Notification(`⚠ GES ALERTA: ${event.system.name}`, {
          body: `${event.launchSite} → ${event.targetSite}`,
          tag: event.id,
        });
      } catch(e){}
    }
  }

  // ── Filter setup ────────────────────────────────────────
  function initFilters() {
    // Tracker filters
    document.querySelectorAll('#tracker-filters .filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tracker-filters .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        trackerFilter = btn.dataset.filter;
        if (currentPage === 'tracker') renderTracker();
      });
    });

    // Arsenal search
    document.getElementById('arsenal-search')?.addEventListener('input', (e) => {
      arsenalSearch = e.target.value.toLowerCase();
      if (currentPage === 'arsenal') renderArsenal();
    });
    document.getElementById('arsenal-country')?.addEventListener('change', (e) => {
      arsenalCountry = e.target.value;
      if (currentPage === 'arsenal') renderArsenal();
    });
    document.getElementById('arsenal-type')?.addEventListener('change', (e) => {
      arsenalTypeFilter = e.target.value;
      if (currentPage === 'arsenal') renderArsenal();
    });

    // Alert filters
    document.querySelectorAll('[data-alert-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-alert-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        alertFilter = btn.dataset.alertFilter;
        if (currentPage === 'alerts') renderAlerts();
      });
    });

    // Map layer filter
    document.querySelectorAll('[data-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-layer]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        MapEngine.setLayerFilter(btn.dataset.layer);
      });
    });

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.remove('open');
    });
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) {
        document.getElementById('modal-overlay').classList.remove('open');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────
  function getRelTime(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return `${Math.floor(diff/1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return `${Math.floor(diff/86400000)}d`;
  }

  return {
    initNav, initFilters, navigateTo,
    addFeedItem, buildTicker, showAlertFlash,
    renderTracker, renderArsenal, renderIntel, renderAlerts,
    get currentPage() { return currentPage; },
  };
})();
