/* Service worker шпаргалки: держит страницу в кэше, чтобы она открывалась без интернета.
   При изменении файлов увеличьте номер версии — старый кэш удалится. */
var CACHE = 'shpargalka-ost-v1';
var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('shpargalka-ost-') === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* cache-first + обновление в фоне (stale-while-revalidate) */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var isPage = req.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: isPage }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });

        if (cached) {
          try { e.waitUntil(network); } catch (err) {}
          return cached;
        }
        return network.then(function (res) {
          if (res) return res;
          if (isPage) return cache.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      });
    })
  );
});
