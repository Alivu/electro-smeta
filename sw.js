// Service Worker для ЭлектроСметы
const APP_VERSION = '1.4.0'; // ← МЕНЯЙТЕ ПРИ КАЖДОМ ОБНОВЛЕНИИ ПРАЙСА!
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;

// Установка
self.addEventListener('install', event => {
  console.log(`⚡ Установка версии ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

// Активация
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Удаляем ВСЕ старые кеши
          if (cacheName.startsWith('electro-smeta-') && 
              cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Немедленно забираем контроль
      return self.clients.claim();
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Пропускаем Яндекс.Метрику и внешние ресурсы
  if (event.request.url.includes('yandex.ru') || 
      event.request.url.includes('mc.yandex') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('raw.githubusercontent.com')) {
    return;
  }
  
  // Универсальная проверка для главной страницы
  const isMainPage = (
    // Любой из этих вариантов
    url.pathname.endsWith('/electro-smeta/') ||
    url.pathname.endsWith('/electro-smeta/index.html') ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    event.request.mode === 'navigate'
  );
  
  // Для главной страницы - всегда свежая версия из сети
  if (isMainPage) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }) // ← ЗАПРЕЩАЕМ КЕШ БРАУЗЕРА
        .then(networkResponse => {
          // Всегда обновляем кеш Service Worker
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Только если сеть недоступна - отдаем из кеша
          return caches.match('./index.html');
        })
    );
    return;
  }
  
  // Для остальных запросов - кеш с фоновым обновлением
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Параллельно загружаем свежую версию для следующего раза
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => null); // Игнорируем ошибки сети
        
        // Сразу возвращаем кеш (если есть) или сеть
        return cachedResponse || fetchPromise;
      })
  );
});

// Получение сообщений
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    caches.delete(CACHE_NAME);
  }
});
