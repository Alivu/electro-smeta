// Service Worker для ЭлектроСметы
const APP_VERSION = '2.2.1';
const CACHE_NAME = `electro-smeta-${APP_VERSION}`;

// Текст уведомления для этой версии
const VERSION_NOTIFICATION = {
  version: APP_VERSION,
  title: '📢 Что нового в версии ' + APP_VERSION,
  message: '✨ Исправлено: Хиджра, Вход в Google Accaunt, Меню сохранения и загрузки.'
};

// Установка
self.addEventListener('install', event => {
  console.log(`Установка версии ${APP_VERSION}`);
  
  // Сохраняем уведомление в кэш
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
          // Удаляем ВСЕ старые кеши
          if (cacheName.startsWith('electro-smeta-') && 
              cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Отправляем уведомление всем открытым клиентам
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
      fetch(event.request, { cache: 'no-store' })
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
  
  // Для остальных GET-запросов - кеш с фоновым обновлением
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
  
  // Клиент запрашивает уведомление
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
