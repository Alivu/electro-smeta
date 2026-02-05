const APP_VERSION = '1.8.0';
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;
const FILES_TO_CACHE = [
  './',
  './index.html',
  './Price_Electric_GrouP.pdf',
  './Icon/icon-72x72.png',
  './Icon/icon-96x96.png',
  './Icon/icon-128x128.png',
  './Icon/icon-144x144.png',
  './Icon/icon-152x152.png',
  './Icon/icon-192x192.png',
  './Icon/icon-384x384.png',
  './Icon/icon-512x512.png',
  './Icon/icon-Maskable-512x512.png',
  './Icon/icon-monochrome-512x512.png'
  // сюда можно добавить CSS и JS, если они есть
];

self.addEventListener('install', event => {
  console.log(`⚡ Установка версии ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('electro-smeta-') && cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') self.skipWaiting();
  if (event.data.action === 'clearCache') caches.delete(CACHE_NAME);
});
