const CACHE = 'admira-v21';
const ASSETS = [
  './', './index.html', './styles.css',
  './lib.js', './lib-print.js', './lib-icons.js',
  './lib-toast.js', './lib-confirm.js',
  './db.js', './templates.js', './app.js',
  './pages/letters.js', './pages/wa.js', './pages/meetings-tasks.js',
  './pages/reports.js', './pages/settings.js',
  './pages/staff.js', './pages/students.js',
  './manifest.webmanifest', './icons/icon.svg',
];
const CDN = [
  'https://esm.sh/dexie@4.0.8',
  'https://esm.sh/jszip@3.10.1',
  'https://cdn.jsdelivr.net/npm/lucide@0.451.0/+esm',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled([
      ...ASSETS.map(u => c.add(u).catch(() => {})),
      ...CDN.map(u => c.add(u).catch(() => {})),
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        // Clone SEKARANG (sinkron) sebelum body dipakai browser
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok) {
          // Clone sinkron sebelum return
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
    })
  );
});
