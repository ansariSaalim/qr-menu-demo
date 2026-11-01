/* Zestro app service worker.
   Makes the app installable and opens it quickly. It never caches orders or
   anything from the database: those always come live from the server. */
const V = 'zestro-app-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (key, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(key, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // The page itself: always try the network first so updates show at once; fall back to the saved copy.
  if (r.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith(fetch(r).then((res) => put('./', res)).catch(() => caches.match('./')));
    return;
  }
  // Versioned libraries (React and friends): saved once, reused.
  if (u.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => put(r, res))));
    return;
  }
  // Fonts and the app's own icons: use the saved copy, refresh it in the background.
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || (u.origin === location.origin && /\/(icons\/|manifest\.webmanifest)/.test(u.pathname))) {
    e.respondWith(caches.match(r).then((hit) => {
      const net = fetch(r).then((res) => put(r, res)).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (database calls, photos, videos) goes straight to the network.
});
