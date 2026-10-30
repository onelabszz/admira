import { db, getSetting, setSetting } from './db.js';
import { esc, fmtDate, today } from './lib.js';
import { icon } from './lib-icons.js';

const routes = {
  '': 'dashboard',
  'letters/in': 'letters',
  'letters/out': 'letters',
  'meetings': 'meetings-tasks',
  'tasks': 'meetings-tasks',
  'reports': 'reports',
  'settings': 'settings',
};

let cleanup = null;

async function boot() {
  const ws = await getSetting('workspace');
  const app = document.getElementById('app');
  if (!ws) return renderOnboarding(app);
  renderShell(app, ws);
  window.addEventListener('hashchange', route);
  route();
  registerServiceWorker();
}

function getInitials(name) {
  if (!name) return 'A';
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function renderShell(app, ws) {
  const initials = getInitials(ws.headmaster || ws.name || 'A');
  app.innerHTML = `
    <header class="topbar">
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false">
        <span class="icon-menu">${icon('Menu', { size: 22 })}</span>
        <span class="icon-close">${icon('X', { size: 22 })}</span>
      </button>
      <a href="#/" class="brand">
        <span class="brand-mark">A</span>
        <span class="brand-text">Admira<span>.</span></span>
      </a>
      <div class="topbar-divider"></div>
      <div class="ws-name" title="${esc(ws.name || 'Sekolah')}">
        ${icon('Building2', { size: 16, className: 'ws-icon' })}
        <span>${esc(ws.name || 'Sekolah')}</span>
      </div>
      <div class="topbar-right">
        <div class="status" id="backup-status">
          <span class="dot"></span>
          <span class="status-text">Tersimpan lokal</span>
        </div>
        <div class="avatar" title="${esc(ws.headmaster || '')}">${esc(initials)}</div>
      </div>
    </header>
    <nav class="side" id="side-nav">
      <div class="nav-section">Utama</div>
      <a href="#/" data-r="">${icon('Home', { size: 17 })}<span>Dashboard</span></a>
      <div class="nav-section">Administrasi</div>
      <a href="#/letters/in" data-r="letters-in">${icon('Inbox', { size: 17 })}<span>Surat Masuk</span></a>
      <a href="#/letters/out" data-r="letters-out">${icon('Send', { size: 17 })}<span>Surat Keluar</span></a>
      <a href="#/meetings" data-r="meetings">${icon('Users', { size: 17 })}<span>Rapat</span></a>
      <a href="#/tasks" data-r="tasks">${icon('SquareCheck', { size: 17 })}<span>Tugas</span></a>
      <div class="nav-section">Lainnya</div>
      <a href="#/reports" data-r="reports">${icon('ChartColumn', { size: 17 })}<span>Laporan</span></a>
      <a href="#/settings" data-r="settings">${icon('Settings', { size: 17 })}<span>Pengaturan</span></a>
    </nav>
    <div class="overlay" id="overlay"></div>
    <main class="content" id="main"></main>
  `;
  updateBackupStatus();
  setupMobileNav();
}

function setupMobileNav() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('side-nav');
  const overlay = document.getElementById('overlay');
  if (!btn || !nav || !overlay) return;

  const open = () => {
    nav.classList.add('open');
    overlay.classList.add('show');
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  };
  const close = () => {
    nav.classList.remove('open');
    overlay.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  };
  const toggle = () => {
    nav.classList.contains('open') ? close() : open();
  };

  btn.addEventListener('click', toggle);
  overlay.addEventListener('click', close);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  window.addEventListener('hashchange', close);

  const mq = window.matchMedia('(min-width: 761px)');
  const onMq = e => { if (e.matches) close(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else mq.addListener(onMq);
}

async function updateBackupStatus() {
  const last = await getSetting('last_backup_at');
  const el = document.getElementById('backup-status');
  if (!el) return;
  const textEl = el.querySelector('.status-text');
  const dot = el.querySelector('.dot');
  if (!textEl || !dot) return;

  if (!last) {
    textEl.textContent = 'Belum backup';
    dot.classList.add('warn');
    return;
  }
  const days = Math.floor((Date.now() - last) / 86400000);
  if (days === 0) textEl.textContent = 'Backup hari ini';
  else if (days === 1) textEl.textContent = 'Backup kemarin';
  else textEl.textContent = `${days} hari lalu`;
  dot.classList.toggle('warn', days > 7);
}

function skeletonPage() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-line lg"></div>
    </div>
    <div class="skeleton-grid">
      <div class="skeleton-stat"></div>
      <div class="skeleton-stat"></div>
      <div class="skeleton-stat"></div>
      <div class="skeleton-stat"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton-line md"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line sm"></div>
    </div>
  `;
}

async function route() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = skeletonPage();
  const hash = location.hash.replace(/^#\/?/, '');
  const [section] = hash.split('/');
  updateNav(hash);

  try {
    if (section === 'letters') {
      const { renderLetters } = await import('./pages/letters.js');
      const type = hash.endsWith('/out') ? 'out' : 'in';
      cleanup = await renderLetters(main, type);
    } else if (section === 'meetings' || section === 'tasks') {
      const { renderMeetingsTasks } = await import('./pages/meetings-tasks.js');
      cleanup = await renderMeetingsTasks(main, section);
    } else if (section === 'reports') {
      const { renderReports } = await import('./pages/reports.js');
      cleanup = await renderReports(main);
    } else if (section === 'settings') {
      const { renderSettings } = await import('./pages/settings.js');
      cleanup = await renderSettings(main);
    } else {
      await renderDashboard(main);
    }
  } catch (err) {
    console.error(err);
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('TriangleAlert', { size: 28 })}</div>
        <div class="empty-title">Terjadi kesalahan</div>
        <div class="empty-hint">${esc(err.message)}</div>
      </div>
    `;
  } finally {
    // transisi masuk
    main.classList.remove('page-enter');
    void main.offsetWidth;
    main.classList.add('page-enter');
  }
}

function updateNav(hash) {
  document.querySelectorAll('nav.side a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href').slice(1) === '/' + hash || a.getAttribute('href') === '#' + '/' + hash);
  });
}

async function renderDashboard(main) {
  const [lettersIn, lettersOut, tasksOpen, meetings, lastBackup] = await Promise.all([
    db.letters.where('type').equals('in').count(),
    db.letters.where('type').equals('out').count(),
    db.tasks.where('status').notEqual('done').count(),
    db.meetings.count(),
    getSetting('last_backup_at'),
  ]);

  const nextTasks = await db.tasks.where('status').notEqual('done').reverse().sortBy('dueDate');

  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - lastBackup) / 86400000) : null;
  const needBackup = !lastBackup || daysSinceBackup > 7;

  main.innerHTML = `
    ${needBackup ? `
      <div class="card" style="border-left:4px solid #F2B705;background:#fffbea;display:flex;gap:12px;align-items:flex-start">
        <div style="color:#B8860B;flex-shrink:0;margin-top:2px">${icon('TriangleAlert', { size: 20 })}</div>
        <div style="flex:1;min-width:0">
          <strong>${lastBackup ? `Backup terakhir ${daysSinceBackup} hari lalu.` : 'Belum pernah backup.'}</strong>
          <p class="muted" style="margin:4px 0 8px">Data Anda hanya tersimpan di perangkat ini. Backup secara rutin agar aman.</p>
          <a href="#/settings" class="btn primary">${icon('Download', { size: 15 })} Buat Backup Sekarang</a>
        </div>
      </div>
    ` : ''}
    <div class="page-head"><h1>Dashboard</h1><span class="muted">${fmtDate(today())}</span></div>
    <div class="grid">
      <div class="stat"><div class="num">${lettersIn}</div><div class="lbl">Surat Masuk</div></div>
      <div class="stat"><div class="num">${lettersOut}</div><div class="lbl">Surat Keluar</div></div>
      <div class="stat"><div class="num">${tasksOpen}</div><div class="lbl">Tugas Belum Selesai</div></div>
      <div class="stat"><div class="num">${meetings}</div><div class="lbl">Rapat Tercatat</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h2>Prioritas Tugas</h2>
      ${nextTasks.slice(0, 5).map(t => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee">
          <div>${esc(t.title)}</div>
          <div class="muted">${fmtDate(t.dueDate)}</div>
        </div>
      `).join('') || '<p class="muted">Tidak ada tugas aktif.</p>'}
    </div>
  `;
}

async function renderOnboarding(app) {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">A</span>
        <span class="brand-text">Admira<span>.</span></span>
      </div>
    </header>
    <div style="grid-column:1/-1">
      <div class="onboard-wrap">
        <h1>Selamat datang di Admira</h1>
        <p class="muted" style="margin-top:4px;margin-bottom:20px">
          Aplikasi berjalan sepenuhnya di perangkat Anda. Tidak ada data yang dikirim ke server.
        </p>
        <form class="form" id="ws-form">
          <label>Nama Sekolah <input name="name" required placeholder="SD Negeri 1 Contoh"></label>
          <label>NPSN <input name="npsn" placeholder="12345678"></label>
          <label>Nama Kepala Sekolah <input name="headmaster" placeholder="Nama Anda"></label>
          <label>Alamat <input name="address" placeholder="Alamat sekolah"></label>
          <button class="btn primary" type="submit" style="width:100%;margin-top:8px">Buat Workspace</button>
        </form>
      </div>
    </div>
  `;
  app.querySelector('#ws-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ws = Object.fromEntries(fd.entries());
    ws.createdAt = Date.now();
    await setSetting('workspace', ws);
    location.reload();
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW gagal:', err));
  }
}

// Expose helper untuk dipakai page settings
window.__admira = { updateBackupStatus };

boot();
