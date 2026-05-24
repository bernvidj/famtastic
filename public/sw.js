const CACHE = 'famtastic-v6';

// Only pre-cache immutable assets (not index.html — it changes on every deploy)
const STATIC = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data  = e.data?.json() ?? {};
  const title = data.title || 'FamTastic';
  const body  = data.body  || '';
  const options = {
    body,
    icon:               data.icon || '/icon-192.png',
    badge:              '/icon-192.png',
    data:               { url: data.url || '/' },
    vibrate:            [200, 100, 200],
    requireInteraction: false,
  };
  // allSettled: a failed showNotification (e.g. iOS suppressed banner) must not
  // prevent the postMessage that drives the in-app toast.
  e.waitUntil(
    Promise.allSettled([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(cs => cs.forEach(c => c.postMessage({ type: 'PUSH_RECEIVED', title, body }))),
    ])
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Network-first for HTML — user always gets the latest app shell
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for JS/CSS/images (content-hashed, safe to cache forever)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone(); // klona synkront innan res konsumeras
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
