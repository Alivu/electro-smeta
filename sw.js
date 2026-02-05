importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.2/workbox-sw.js');

const APP_VERSION = '1.9.0';
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;

// Файлы для кеша
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
  // сюда можно добавить CSS и JS, если есть
];

// Установка SW и кеширование
self.addEventListener('install', (event) => {
  console.log(`⚡ Установка версии ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Активация и удаление старых кешей
self.addEventListener('activate', (event) => {
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

// Навигация и офлайн fallback через Workbox
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE_NAME,
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
);

// Остальные запросы: кеш с фоновым обновлением
workbox.routing.registerRoute(
  ({ request }) => request.destination !== 'document',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE_NAME,
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxEntries: 100 }),
    ],
  })
);

// Сообщения для управления SW
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') self.skipWaiting();
  if (event.data && event.data.action === 'clearCache') caches.delete(CACHE_NAME);
});
