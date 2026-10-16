/* Service worker: tryb offline + przypomnienia (periodic background sync) */
const VERSION = 'nastroj-v18';
const STATE_CACHE = 'nastroj-state';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './komplementy.js',
  './energy.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-96.png',
  './icons/jednorozec.svg',
  './icons/rownowaznia.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== STATE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first z odświeżaniem w tle (stale-while-revalidate)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const network = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('./index.html');
    return Response.error();
  })());
});

/* ---------- przypomnienia ---------- */
const pad2 = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const minutesOf = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

async function remind() {
  const cache = await caches.open(STATE_CACHE);
  const res = await cache.match('./__state');
  if (!res) return;
  const st = await res.json();
  if (!st.notify) return;

  const now = new Date();
  const k = dkey(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const filled = st.today === k ? st.filled : [];
  st.notified = st.notified || {};

  for (const [slot, time] of Object.entries(st.times)) {
    const due = minutesOf(time);
    const tag = `${k}|${slot}`;
    if (m >= due && m < due + 180 && !filled.includes(slot) && !st.notified[tag]) {
      st.notified[tag] = true;
      await self.registration.showNotification('Jak się czujesz? 💗', {
        body: `Czas na ocenę: ${(st.labels?.[slot] || slot).toLowerCase()}`,
        icon: 'icons/icon-192.png',
        badge: 'icons/badge-96.png',
        tag: `mood-${slot}`,
        data: { slot },
      });
    }
  }
  await cache.put('./__state', new Response(JSON.stringify(st), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'mood-reminder') e.waitUntil(remind());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  })());
});
