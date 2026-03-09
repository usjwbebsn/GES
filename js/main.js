/* ============================================================
   YEY cam — Logica del sitio
   Lee datos de: js/cameras.js y js/config.js
   No toques este archivo salvo que sepas lo que haces.
   ============================================================ */

/* ── APLICAR COLORES DE CONFIG ─────────────────────────────── */

(function applyColors() {
  const root = document.documentElement;
  const c = CONFIG.colors;
  root.style.setProperty('--bg',      c.bg);
  root.style.setProperty('--surface', c.surface);
  root.style.setProperty('--border',  c.border);
  root.style.setProperty('--text',    c.text);
  root.style.setProperty('--muted',   c.muted);
  root.style.setProperty('--accent',  c.accent);
  root.style.setProperty('--success', c.success);
})();


/* ── APLICAR TEXTOS DE CONFIG ──────────────────────────────── */

(function applyTexts() {
  document.title = CONFIG.site.name;
  const logoEl = document.getElementById('nav-logo-text');
  if (logoEl) {
    const [first, ...rest] = CONFIG.site.name.split(' ');
    logoEl.innerHTML = first + (rest.length ? `<em>${rest.join(' ')}</em>` : '');
  }
})();


/* ── CONSTRUIR NAV TABS ────────────────────────────────────── */

(function buildNavTabs() {
  const container = document.getElementById('nav-tabs');
  if (!container) return;
  CONFIG.navTabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'nav-tab' + (i === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.addEventListener('click', () => setTab(btn, tab.value));
    container.appendChild(btn);
  });
})();


/* ── CONSTRUIR PILLS ───────────────────────────────────────── */

(function buildPills() {
  const container = document.getElementById('pills');
  if (!container) return;
  CONFIG.pills.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (i === 0 ? ' on' : '');
    btn.textContent = p.label;
    btn.addEventListener('click', () => setPill(btn, p.value));
    container.appendChild(btn);
  });
})();


/* ── STATE ─────────────────────────────────────────────────── */

let currentFilter = 'all';
let heroIdx       = 0;
let heroTimer     = null;
let searchOpen    = false;


/* ── HELPERS ────────────────────────────────────────────────── */

function getFiltered() {
  const active = CAMERAS.filter(c => c.active !== false);
  if (currentFilter === 'all') return active;
  return active.filter(c =>
    c.region === currentFilter || c.category === currentFilter
  );
}

function getFeatured() {
  const active = CAMERAS.filter(c => c.active !== false);
  const feat   = active.filter(c => c.featured);
  return feat.length ? feat : active.slice(0, 5);
}

function toEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com/watch')) {
    const vid = url.split('v=')[1]?.split('&')[0];
    if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
  }
  if (url.includes('youtu.be/')) {
    const vid = url.split('youtu.be/')[1]?.split('?')[0];
    if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
  }
  return url;
}

function buildPlayer(cam) {
  const url = cam.url || '';
  if (url.includes('.m3u8')) {
    return `<video controls autoplay style="width:100%;height:100%;background:#000">
              <source src="${url}" type="application/x-mpegURL">
            </video>`;
  }
  return `<iframe
    src="${toEmbedUrl(url)}"
    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
    allowfullscreen>
  </iframe>`;
}


/* ── LOCKUP BUILDER ─────────────────────────────────────────── */

function makeLockup(cam, isGrid = false) {
  const div = document.createElement('div');
  div.className = isGrid ? 'lockup-grid fade-up' : 'lockup fade-up';

  div.innerHTML = `
    <div class="lockup-thumb">
      <img src="${cam.thumb || ''}" alt="${cam.title}" loading="lazy"
        onerror="this.style.display='none'">
      <div class="lockup-scrim"></div>
      ${cam.live ? `
        <div class="lockup-live">
          <span class="live-dot-sm"></span>EN VIVO
        </div>` : ''}
      <div class="lockup-play-btn">
        <div class="play-circle">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M5 3l14 9-14 9V3z"/>
          </svg>
        </div>
      </div>
    </div>
    <div class="lockup-body">
      <div class="lockup-name">${cam.title}</div>
      <div class="lockup-meta">
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${cam.country}<span class="meta-dot"></span>${cam.category}
      </div>
    </div>
  `;

  div.addEventListener('click', () => openTheatre(cam));
  return div;
}


/* ── SHELF BUILDER ──────────────────────────────────────────── */

function makeShelf(title, list, isGrid, trackId) {
  if (!list.length) return null;

  const section = document.createElement('div');
  section.className = 'shelf';

  section.innerHTML = `
    <div class="shelf-head">
      <h2 class="shelf-title">${title}</h2>
      <button class="shelf-see-all">
        Ver todo
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
    <div class="shelf-track-outer">
      ${!isGrid ? `
        <button class="shelf-arrow prev" onclick="scrollTrack('${trackId}', -1)">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="shelf-track" id="${trackId}"></div>
        <button class="shelf-arrow next" onclick="scrollTrack('${trackId}', 1)">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      ` : `<div class="shelf-grid" id="${trackId}"></div>`}
    </div>
  `;

  const container = section.querySelector(`#${trackId}`);
  list.forEach((cam, i) => {
    const el = makeLockup(cam, isGrid);
    el.classList.add(`d${Math.min(i + 1, 6)}`);
    container.appendChild(el);
  });

  return section;
}

function scrollTrack(id, dir) {
  document.getElementById(id)?.scrollBy({ left: dir * 320, behavior: 'smooth' });
}


/* ── RENDER SHELVES ─────────────────────────────────────────── */

function renderAll() {
  const list    = getFiltered();
  const shelves = document.getElementById('shelves');
  shelves.innerHTML = '';

  if (!list.length) {
    shelves.innerHTML = '<div class="empty">No hay camaras para este filtro.</div>';
    return;
  }

  const S = CONFIG.sections;
  const live  = list.filter(c => c.live);
  const nat   = list.filter(c => c.category === 'Naturaleza');
  const city  = list.filter(c => c.category === 'Ciudad');
  const sea   = list.filter(c => c.category === 'Mar');
  const rest  = list.filter(c => !['Naturaleza','Ciudad','Mar'].includes(c.category));

  const add = (title, data, grid, id) => {
    if (!data.length) return;
    const s = makeShelf(title, data, grid, id);
    if (s) shelves.appendChild(s);
  };

  add(S.live,   live,  false, 'track-live');
  add(S.nature, nat,   false, 'track-nat');
  add(S.cities, city,  true,  'track-city');
  add(S.sea,    sea,   false, 'track-sea');
  if (rest.length) add(S.other, rest, false, 'track-rest');
}


/* ── HERO ───────────────────────────────────────────────────── */

function renderHero() {
  const list = getFeatured();
  if (!list.length) return;

  const cam = list[heroIdx % list.length];

  document.getElementById('hero-title').textContent       = cam.title;
  document.getElementById('hero-desc').textContent        = cam.description || `${cam.country} — ${cam.category}`;
  document.getElementById('hero-eyebrow-txt').textContent = cam.live ? 'En vivo' : cam.category;
  document.getElementById('hero-frame').src               = cam.url;

  document.getElementById('btn-watch').onclick = () => openTheatre(cam);
  document.getElementById('btn-more').onclick  = () => openTheatre(cam);

  const dotsEl = document.getElementById('hero-dots');
  dotsEl.innerHTML = '';
  list.slice(0, 6).forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'hero-dot' + (i === heroIdx % list.length ? ' active' : '');
    btn.addEventListener('click', () => { heroIdx = i; renderHero(); });
    dotsEl.appendChild(btn);
  });
}

function startHeroRotation() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    heroIdx++;
    renderHero();
  }, (CONFIG.site.heroInterval || 12) * 1000);
}


/* ── THEATRE ────────────────────────────────────────────────── */

function openTheatre(cam) {
  document.getElementById('theatre-name').textContent     = cam.title;
  document.getElementById('theatre-country').textContent  = cam.country;
  document.getElementById('theatre-category').textContent = cam.category;
  document.getElementById('theatre-player').innerHTML     = buildPlayer(cam);
  document.getElementById('theatre-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTheatre() {
  document.getElementById('theatre-backdrop').classList.remove('open');
  document.getElementById('theatre-player').innerHTML = '';
  document.body.style.overflow = '';
}

function theatreFullscreen() {
  const el = document.getElementById('theatre-modal');
  if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}


/* ── SEARCH ─────────────────────────────────────────────────── */

function toggleSearchBar() {
  searchOpen = !searchOpen;
  const inp = document.getElementById('search-inline');
  inp.classList.toggle('open', searchOpen);
  if (searchOpen) inp.focus();
  else { inp.value = ''; closeSearchOverlay(); }
}

function onSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { closeSearchOverlay(); return; }
  runSearch(q);
}

function runSearch(q) {
  const found = CAMERAS.filter(c =>
    c.active !== false && (
      c.title.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  );

  const grid = document.getElementById('search-results-grid');
  grid.innerHTML = '';

  if (!found.length) {
    grid.innerHTML = `<p style="color:var(--muted);font-size:15px;grid-column:1/-1">Sin resultados para "${q}"</p>`;
  } else {
    found.slice(0, 12).forEach(c => grid.appendChild(makeLockup(c, true)));
  }

  document.getElementById('search-overlay-field').value = q;
  document.getElementById('search-overlay').classList.add('open');
}

function closeSearchOverlay() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-inline').value = '';
  document.getElementById('search-inline').classList.remove('open');
  searchOpen = false;
}

function onOverlaySearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (q) runSearch(q);
  else closeSearchOverlay();
}


/* ── FILTROS ────────────────────────────────────────────────── */

function setTab(btn, val) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = val;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  document.querySelector('.pill')?.classList.add('on');
  renderAll();
}

function setPill(btn, val) {
  currentFilter = val;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  renderAll();
}


/* ── NAV SCROLL ─────────────────────────────────────────────── */

window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
});


/* ── TECLADO ────────────────────────────────────────────────── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeTheatre(); closeSearchOverlay(); }
});


/* ── INIT ───────────────────────────────────────────────────── */

renderHero();
startHeroRotation();
renderAll();
