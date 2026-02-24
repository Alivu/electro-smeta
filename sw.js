// Service Worker для ЭлектроСметы
const APP_VERSION = '2.2.5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;

// Текст уведомления для этой версии
const VERSION_NOTIFICATION = {
  version: APP_VERSION,
  title: '📢 Что нового в версии ' + APP_VERSION,
  message: '✨ Добавлено 110 Розетка выдвижная (Pop-Up) для мебели шт. 2500, Обновлен 109п, 166п, 167.'
};

// Установка
self.addEventListener('install', event => {
  console.log(`Установка версии ${APP_VERSION}`);
  
  event.waitUntil(
    caches.open('app-notifications')
      .then(cache => {
        return cache.put('latest-notification', 
          new Response(JSON.stringify(VERSION_NOTIFICATION), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      })
      .then(() => caches.open(CACHE_NAME))
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
          if (cacheName.startsWith('electro-smeta-') && 
              cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'VERSION_UPDATE',
            version: APP_VERSION,
            notification: VERSION_NOTIFICATION
          });
        });
      });
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Пропускаем внешние ресурсы
  if (event.request.url.includes('yandex.ru') || 
      event.request.url.includes('mc.yandex') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('raw.githubusercontent.com')) {
    return;
  }
  
  // ⚠️ ВАЖНО: Пропускаем все POST-запросы (Google API, сохранение и т.д.)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // ⚠️ ВАЖНО: Пропускаем запросы к Google API
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('firebaseapp.com')) {
    return;
  }
  
  // ⚠️ ДОБАВЛЯЕМ: Пропускаем запросы к api.aladhan.com (исламский календарь)
  if (event.request.url.includes('api.aladhan.com')) {
    return;
  }
  
  // Универсальная проверка для главной страницы
  const isMainPage = (
    // Для Vercel (новый домен)
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    // Для GitHub Pages (старый домен, для обратной совместимости)
    url.pathname.endsWith('/electro-smeta/') ||
    url.pathname.endsWith('/electro-smeta/index.html') ||
    event.request.mode === 'navigate'
  );
  
  // Для главной страницы - всегда свежая версия из сети
  if (isMainPage) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }
  
  // Для остальных GET-запросов - кеш с фоновым обновлением
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => null);
        
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
  
  if (event.data && event.data.type === 'GET_NOTIFICATION') {
    caches.open('app-notifications').then(cache => {
      cache.match('latest-notification').then(response => {
        if (response) {
          response.json().then(notification => {
            event.source.postMessage({
              type: 'NOTIFICATION_RESPONSE',
              notification: notification
            });
          });
        }
      });
    });
  }
});
