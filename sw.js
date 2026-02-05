const APP_VERSION = '1.6.1';
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;
const OFFLINE_PAGE = './index.html'; // теперь fallback на твой index.html

// Установка - кешируем все ресурсы
self.addEventListener('install', event => {
  console.log(`⚡ Установка версии ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        './',
        './index.html',
        // можно добавить PDF или другие ресурсы, если нужно оффлайн
        './Price_Electric_GrouP.pdf'
      ]))
      .then(() => self.skipWaiting())
  );
});

// Активация - удаляем старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.startsWith('electro-smeta-') && cacheName !== CACHE_NAME) {
          console.log('🗑️ Удаляем старый кеш:', cacheName);
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Главная страница (index.html) - network first с fallback на кеш
  const isMainPage = (
    url.pathname.endsWith('/electro-smeta/') ||
    url.pathname.endsWith('/index.html') ||
    event.request.mode === 'navigate'
  );

  if (isMainPage) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // обновляем кеш
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(OFFLINE_PAGE, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Остальные запросы - кеш first с фоновым обновлением
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
  );
});

// Сообщения
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') self.skipWaiting();
  if (event.data.action === 'clearCache') caches.delete(CACHE_NAME);
});
