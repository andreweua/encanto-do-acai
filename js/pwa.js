(() => {
    if ('serviceWorker' in navigator && /^https?:/.test(window.location.protocol)) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => {
                // Ignora falha silenciosa de registro do SW
            });
        });
    }
})();
