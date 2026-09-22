const CACHE_NAME = 'todolist-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/login',
  '/signup',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network first, fallback to cache for offline capabilities)
self.addEventListener('fetch', (event) => {
  // Hanya handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jangan cache request API eksternal (misal Supabase) atau auth callbacks
  if (url.origin !== self.location.origin || url.pathname.startsWith('/auth/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Simpan cache salinan halaman statis jika respons valid
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Jika offline, ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika navigasi halaman offline dan tidak ada di cache, arahkan ke '/'
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

