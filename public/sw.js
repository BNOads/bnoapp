const CACHE_VERSION = 'bnoads-v2';
const CACHE_NAME = `bnoads-pwa-${CACHE_VERSION}`;

// URLs que podem ser pré-cacheadas (apenas recursos internos)
const PRECACHE_URLS = [
  '/',
  '/index.html'
];

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Usar addAll com try/catch para evitar falhas
        return Promise.allSettled(
          PRECACHE_URLS.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`SW: Failed to cache ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => {
        console.log('SW: Pre-cache completed');
        self.skipWaiting();
      })
      .catch(err => {
        console.error('SW: Pre-cache failed:', err);
      })
  );
});

// Função para verificar se deve cachear a requisição
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Não cachear se for:
  // - Método diferente de GET
  // - URL externa (domínio diferente)
  // - Rotas de API (/api/, /functions/)
  // - ClickUp, Hotmart, Facebook etc.
  
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.includes('/api/')) return false;
  if (url.pathname.includes('/functions/')) return false;
  if (url.hostname.includes('clickup.com')) return false;
  if (url.hostname.includes('hotmart.com')) return false;
  if (url.hostname.includes('facebook.com')) return false;
  if (url.hostname.includes('supabase.co')) return false;
  
  return true;
}

// Função para verificar se é um recurso estático
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Fetch event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Para APIs externas e ClickUp: sempre network-only
  if (!shouldCache(request)) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Para recursos estáticos: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone).catch(err => {
                      console.warn('SW: Failed to cache', request.url, err);
                    });
                  });
              }
              return response;
            })
            .catch(err => {
              console.warn('SW: Network failed for', request.url, err);
              throw err;
            });
        })
    );
    return;
  }
  
  // Para páginas: network-first com fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone).catch(err => {
                console.warn('SW: Failed to cache page', request.url, err);
              });
            });
        }
        return response;
      })
      .catch(() => {
        // Se network falha, tenta cache
        return caches.match(request);
      })
  );
});

// Activate event - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activated');
        return self.clients.claim();
      })
  );
});