const CACHE_NAME = 'encanto-acai-v1.8.4';
const SHELL_ASSETS = [
    './',
    './index.html',
    './acompanhar.html',
    './caixa.html',
    './cozinha.html',
    './admin.html',
    './f/index.html',
    './manifest.webmanifest',
    './css/app.css',
    './assets/favicon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './js/config.js',
    './js/estoque.js',
    './js/pix.js',
    './js/app.js',
    './js/acompanhar.js',
    './js/pedidos-painel.js',
    './js/admin.js',
    './js/pwa.js',
    './js/versao.js',
];

const CDN_HOSTS = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.allSettled(
                SHELL_ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' }))),
            ))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
            ))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Nunca cachear chamadas dinâmicas de API/Planilha
    if (
        url.hostname.includes('script.google.com')
        || url.hostname.includes('script.googleusercontent.com')
        || url.hostname.includes('docs.google.com')
    ) {
        return;
    }

    // Cacheia CDNs de estilo/fontes para manter o visual funcionando offline
    if (url.origin !== self.location.origin) {
        if (!CDN_HOSTS.some((host) => url.hostname.includes(host))) {
            return;
        }
        event.respondWith(
            caches.match(request).then((cached) => {
                const networkFetch = fetch(request)
                    .then((response) => {
                        if (response && (response.ok || response.type === 'opaque')) {
                            const copy = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || networkFetch;
            }),
        );
        return;
    }

    // Mesma origem: network-first com fallback para cache ignorando query string (?v=..., ?pedido=...)
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(request, { ignoreSearch: true });
                if (cached) return cached;
                if (request.mode === 'navigate') {
                    const fallback = await caches.match('./index.html');
                    if (fallback) return fallback;
                }
                return new Response('Offline', { status: 503, statusText: 'Offline' });
            }),
    );
});
