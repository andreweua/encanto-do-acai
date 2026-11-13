const CACHE_NAME = 'encanto-acai-v1.6.0';
const SHELL_ASSETS = [
    './',
    './index.html',
    './acompanhar.html',
    './caixa.html',
    './cozinha.html',
    './admin.html',
    './manifest.webmanifest',
    './css/app.css',
    './assets/favicon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './js/config.js',
    './js/estoque.js',
    './js/app.js',
    './js/acompanhar.js',
    './js/pedidos-painel.js',
    './js/admin.js',
    './js/pwa.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
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

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request)),
    );
});
