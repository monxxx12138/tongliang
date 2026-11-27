/* 铜梁龙周报 · Service Worker
   外壳 + 数据离线可用；data.json 走「网络优先」，服务器一更新就能拿到。 */
const VERSION = 'tll-v20';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './data.json',
  './icon-192.png', './icon-512.png', './icon-180.png', './icon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;
  if (e.request.method !== 'GET') return;

  if (/\.json$/i.test(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)).catch(() => {}); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put('./index.html', c)).catch(() => {}); return r; })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)).catch(() => {}); return r;
    }).catch(() => hit))
  );
});
