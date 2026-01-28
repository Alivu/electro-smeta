// Service Worker для ЭлектроСмета
const CACHE_NAME = 'electro-smeta-v1';
const urlsToCache = [
  './',
  './index.html'
];

// Установка
self.addEventListener('install', event => {
  console.log('⚡ Установка Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Кэширование основных файлов');
        // Кэшируем только главную страницу
        return cache.addAll(['./', './index.html']);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация
self.addEventListener('activate', event => {
  console.log('🔧 Активация Service Worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем Яндекс.Метрику и внешние ресурсы
  if (event.request.url.includes('yandex.ru') || 
      event.request.url.includes('mc.yandex') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('raw.githubusercontent.com')) {
    return; // Не кэшируем внешние ресурсы
  }
  
  // Только локальные запросы
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }
        
        // Загружаем из сети
        return fetch(event.request)
          .then(response => {
            // Не кэшируем ошибки и большие файлы
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Клонируем для кэширования
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.log('❌ Ошибка загрузки:', error);
            // Для навигационных запросов возвращаем главную
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Офлайн режим', {
              status: 408,
              headers: {'Content-Type': 'text/plain'}
            });
          });
      })
  );
});

// Получение сообщений
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
