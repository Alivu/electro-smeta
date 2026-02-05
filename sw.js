const APP_VERSION = '1.9.1';
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;
const OFFLINE_PAGE = './offline.html';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './Price_Electric_GrouP.pdf',
  OFFLINE_PAGE,
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
];

// Установка SW и кеширование
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Активация и удаление старых кешей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key.startsWith('electro-smeta-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Навигация — отдаём offline.html при отсутствии сети
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Пропускаем внешние ресурсы (Яндекс, CDN и т.д.)
  if (event.request.url.includes('yandex.ru') || 
      event.request.url.includes('mc.yandex') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('raw.githubusercontent.com')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(networkResponse => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Остальные запросы — кеш с фоновым обновлением
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
  );
});

// Сообщения для управления SW
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
  if (event.data?.action === 'clearCache') caches.delete(CACHE_NAME);
});
