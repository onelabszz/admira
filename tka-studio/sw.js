/**
 * TKA Studio — sw.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
const CACHE = 'tka-studio-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './lib/tka-schema.js',
  './lib/quality-checks.js',
  './lib/prompt-template.js',
  './lib/csv-export.js',
  './lib/parser/index.js',
  './pages/build.js',
  './pages/paste.js',
  './pages/preview.js',
  './pages/export.js',
  './pages/auth.js',
  './components/Stepper.js',
  './stores/studio.js',
  './supabase/client.js',
  './supabase/auth.js',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function (err) { console.warn('SW install partial:', err); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.hostname === 'esm.sh' || url.hostname.slice(-7) === '.esm.sh') {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        return fetch(e.request).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
          return res;
        }).catch(function () {
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (r) {
          if (r) return r;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 503 });
        });
      })
    );
  }
});
