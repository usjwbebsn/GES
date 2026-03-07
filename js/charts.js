/* ═══════════════════════════════════════
   GES — charts.js
   Canvas-based charts: threat gauge,
   activity timeline, intercept donut
   ═══════════════════════════════════════ */

const Charts = (() => {

  // ── Threat Gauge (half donut) ──────────────────────────
  let gaugeValue = 0;
  let gaugeTarget = 0;
  let gaugeAnimFrame = null;

  function drawGauge(canvas, value) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H - 10;
    const r = Math.min(W, H * 1.8) * 0.42;
    const startAngle = Math.PI;
    const endAngle = 0;
    const valueAngle = Math.PI + (value / 100) * Math.PI;

    // Color based on value
    let color;
    if (value < 25) color = '#39FF14';
    else if (value < 50) color = '#F5E642';
    else if (value < 75) color = '#FF8C00';
    else color = '#FF2040';

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    if (value > 0) {
      // Gradient
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, '#39FF14');
      grad.addColorStop(0.4, '#F5E642');
      grad.addColorStop(0.7, '#FF8C00');
      grad.addColorStop(1, '#FF2040');

      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, valueAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const inner = r - 16;
      const outer = r - 8;
      const x1 = cx + inner * Math.cos(angle);
      const y1 = cy + inner * Math.sin(angle);
      const x2 = cx + outer * Math.cos(angle);
      const y2 = cy + outer * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Labels
    const labelAngles = [
      { angle: Math.PI, label: '0' },
      { angle: Math.PI * 1.25, label: '25' },
      { angle: Math.PI * 1.5, label: '50' },
      { angle: Math.PI * 1.75, label: '75' },
      { angle: 0, label: '100' },
    ];
    ctx.font = '9px "DM Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    labelAngles.forEach(({ angle, label }) => {
      const dist = r + 14;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle) + 3;
      ctx.fillText(label, x, y);
    });
  }

  function animateGauge(canvas, from, to) {
    if (gaugeAnimFrame) cancelAnimationFrame(gaugeAnimFrame);
    const dur = 800;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1-t, 3);
      gaugeValue = from + (to - from) * ease;
      drawGauge(canvas, gaugeValue);
      if (t < 1) gaugeAnimFrame = requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateGauge(value) {
    const canvas = document.getElementById('threat-canvas');
    if (!canvas) return;
    animateGauge(canvas, gaugeValue, value);
    gaugeTarget = value;

    // Center text
    const lvlEl = document.getElementById('tci-val');
    const textEl = document.getElementById('tci-level-text');
    if (lvlEl) animateNumber(lvlEl, parseInt(lvlEl.textContent) || 0, Math.round(value));
    if (textEl) {
      let t = 'NOMINAL';
      if (value > 75) t = 'CRÍTICO';
      else if (value > 50) t = 'ELEVADO';
      else if (value > 25) t = 'MODERADO';
      textEl.textContent = t;
      textEl.style.color = value > 75 ? 'var(--neon-red)' : value > 50 ? 'var(--neon-orange)' : value > 25 ? 'var(--neon-yellow)' : 'var(--neon-green)';
    }
    // Nav threat level
    const navEl = document.getElementById('nav-threat');
    if (navEl) {
      let t = 'LOW';
      if (value > 75) t = 'CRÍTICO';
      else if (value > 50) t = 'ALTO';
      else if (value > 25) t = 'MEDIO';
      navEl.textContent = t;
      navEl.style.color = value > 75 ? 'var(--neon-red)' : 'var(--neon-orange)';
    }
  }

  function computeThreatLevel(stats) {
    let score = 0;
    score += Math.min(stats.active * 4, 40);
    score += Math.min(stats.critical * 8, 30);
    score += Math.min((stats.byType?.hypersonic || 0) * 15, 20);
    score += Math.min(stats.today * 0.5, 10);
    return Math.min(100, score);
  }

  // ── Activity Chart (24h timeline) ─────────────────────
  let activityData = [];

  function initActivityData() {
    // 24 hourly buckets
    activityData = new Array(24).fill(0).map((_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 8) + (i > 8 && i < 22 ? 4 : 1),
    }));
  }

  function bumpCurrentHour() {
    const h = new Date().getUTCHours();
    activityData[h].count++;
    drawActivityChart();
  }

  function drawActivityChart() {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const currentHour = new Date().getUTCHours();
    const maxVal = Math.max(...activityData.map(d => d.count), 1);
    const barW = (W - 40) / 24 - 2;
    const padL = 36, padB = 24, padT = 10;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + ((H - padT - padB) / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '9px "DM Mono"';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i/4)), padL - 4, y + 3);
    }

    activityData.forEach((d, i) => {
      const x = padL + i * (barW + 2);
      const barH = ((d.count / maxVal) * (H - padT - padB));
      const y = H - padB - barH;

      // Color: current hour red, past orange, future dim
      let clr;
      if (i === currentHour) clr = '#FF2040';
      else if (i < currentHour) clr = '#FF8C00';
      else clr = 'rgba(255,140,0,0.2)';

      // Glow for current
      if (i === currentHour) {
        ctx.shadowColor = '#FF2040';
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = clr;
      ctx.fillRect(x, y, barW, barH);
      ctx.shadowBlur = 0;

      // Hour label every 4h
      if (i % 4 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '8px "DM Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(`${String(i).padStart(2,'0')}h`, x + barW/2, H - padB + 12);
      }
    });

    // Current time marker
    const cx = padL + currentHour * (barW + 2) + barW/2;
    ctx.strokeStyle = '#FF2040';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, H - padB); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Intercept donut ────────────────────────────────────
  function drawInterceptDonut(rate) {
    const canvas = document.getElementById('intercept-donut');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width = 120, H = canvas.height = 120;
    ctx.clearRect(0, 0, W, H);

    const cx = W/2, cy = H/2, r = 44;
    const angle = (rate / 100) * Math.PI * 2;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Fill
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + angle);
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Number animation ───────────────────────────────────
  function animateNumber(el, from, to, duration = 600) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1-t, 2);
      el.textContent = Math.round(from + (to - from) * ease);
      el.classList.add('num-update');
      if (t < 1) requestAnimationFrame(step);
      else {
        el.textContent = to;
        setTimeout(() => el.classList.remove('num-update'), 300);
      }
    }
    requestAnimationFrame(step);
  }

  // ── Build threat bar items ─────────────────────────────
  function buildThreatBars(stats) {
    const el = document.getElementById('threat-bars');
    if (!el) return;

    const items = [
      { label: 'BALÍSTICO', val: stats.byType?.ballistic || 0, max: 20, color: '#FF2040' },
      { label: 'CRUCERO',   val: stats.byType?.cruise || 0,     max: 30, color: '#FF8C00' },
      { label: 'HIPERSÓNICO', val: stats.byType?.hypersonic || 0, max: 10, color: '#00F5D4' },
      { label: 'DRON',      val: stats.byType?.drone || 0,       max: 30, color: '#F5E642' },
    ];

    el.innerHTML = items.map(item => {
      const pct = Math.min(100, (item.val / item.max) * 100);
      return `
        <div class="threat-bar-item">
          <div class="tbi-label">${item.label}</div>
          <div class="tbi-val" style="color:${item.color}">${item.val}</div>
          <div class="tbi-bar">
            <div class="tbi-fill" style="width:${pct}%;background:${item.color}"></div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Intel zone bars ────────────────────────────────────
  function buildZoneBars(stats) {
    const el = document.getElementById('zone-bars');
    if (!el) return;

    const zones = Object.entries(stats.byZone || {})
      .sort((a,b) => b[1] - a[1])
      .slice(0, 6);

    const maxVal = zones[0]?.[1] || 1;
    const colors = ['#FF2040','#FF8C00','#F5E642','#00F5D4','#39FF14','#FF0080'];

    el.innerHTML = zones.map(([name, count], i) => {
      const pct = (count / maxVal) * 100;
      return `
        <div class="zone-bar-item">
          <div class="zbi-name">${name}</div>
          <div class="zbi-bar-wrap">
            <div class="zbi-bar-fill" style="width:${pct}%;background:${colors[i]};box-shadow:0 0 6px ${colors[i]}60"></div>
          </div>
          <div class="zbi-val">${count}</div>
          <div class="zbi-label">EVENTOS</div>
        </div>`;
    }).join('');
  }

  // ── System frequency ───────────────────────────────────
  function buildSystemFrequency(stats) {
    const el = document.getElementById('sys-frequency');
    if (!el) return;

    const systems = Object.entries(stats.bySystem || {})
      .sort((a,b) => b[1]-a[1])
      .slice(0, 8);

    el.innerHTML = systems.map(([name, count], i) => {
      const sys = MISSILE_DB.find(m => m.name === name);
      const country = sys?.flag || '🌐';
      return `
        <div class="sys-freq-item">
          <div class="sfi-rank">${i+1}</div>
          <div>
            <div class="sfi-name">${name}</div>
            <div class="sfi-country">${country} ${sys?.country?.toUpperCase() || ''}</div>
          </div>
          <div class="sfi-count">${count}</div>
        </div>`;
    }).join('');
  }

  // ── Intercept stats ────────────────────────────────────
  function buildInterceptStats(stats) {
    const el = document.getElementById('intercept-stats');
    if (!el) return;
    const rate = stats.interceptRate || 0;
    el.innerHTML = `
      <div class="intercept-ring">
        <canvas id="intercept-donut" width="120" height="120"></canvas>
        <div class="ir-val">${rate}%</div>
        <div class="ir-label">TASA INTERCEPCIÓN</div>
      </div>
      <div style="padding:0 16px 12px;display:flex;flex-direction:column;gap:8px">
        <div class="gpc-row"><span class="gpc-label">INTERCEPTADOS</span>
          <span class="gpc-val" style="color:var(--neon-green)">${stats.intercepted}</span></div>
        <div class="gpc-row"><span class="gpc-label">IMPACTOS</span>
          <span class="gpc-val" style="color:var(--neon-red)">${stats.impacts}</span></div>
        <div class="gpc-row"><span class="gpc-label">TOTAL EVENTOS</span>
          <span class="gpc-val">${stats.total}</span></div>
      </div>`;
    requestAnimationFrame(() => drawInterceptDonut(rate));
  }

  // ── Country analysis ───────────────────────────────────
  function buildCountryAnalysis(stats) {
    const el = document.getElementById('country-analysis');
    if (!el) return;

    const countries = [
      { key: 'russia', name: 'Rusia', flag: '🇷🇺', color: '#FF2040' },
      { key: 'iran', name: 'Irán + Proxies', flag: '🇮🇷', color: '#FF8C00' },
      { key: 'nkorea', name: 'Corea del Norte', flag: '🇰🇵', color: '#FF0080' },
      { key: 'china', name: 'China (Ejercicios)', flag: '🇨🇳', color: '#F5E642' },
      { key: 'usa', name: 'EE.UU. (Test/Ops)', flag: '🇺🇸', color: '#0080FF' },
    ];

    // Count events by country using system data
    const byCountry = {};
    const allEvts = Simulator.getEvents('all');
    allEvts.forEach(e => {
      const c = e.system?.country || 'unknown';
      byCountry[c] = (byCountry[c] || 0) + 1;
    });

    const total = allEvts.length || 1;

    el.innerHTML = countries.map(c => {
      const count = byCountry[c.key] || 0;
      const pct = Math.round(count / total * 100);
      const types = [...new Set(
        allEvts.filter(e => e.system?.country === c.key).map(e => e.type)
      )].join(', ');
      return `
        <div class="country-row">
          <div class="cr-flag">${c.flag}</div>
          <div>
            <div class="cr-name">${c.name}</div>
            <div class="cr-sub">${types || 'Sin actividad reciente'}</div>
          </div>
          <div class="cr-stat">
            <div class="cr-val" style="color:${c.color}">${count}</div>
            <div class="cr-slabel">EVENTOS (${pct}%)</div>
          </div>
        </div>`;
    }).join('');
  }

  return {
    updateGauge, computeThreatLevel,
    initActivityData, bumpCurrentHour, drawActivityChart,
    buildThreatBars, buildZoneBars, buildSystemFrequency,
    buildInterceptStats, buildCountryAnalysis,
    animateNumber, drawInterceptDonut,
  };
})();
