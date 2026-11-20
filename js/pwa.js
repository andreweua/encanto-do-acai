(() => {
    const DISMISS_KEY = 'encanto_pwa_banner_dispensado_em';
    const DISMISS_DAYS = 7;
    let deferredPrompt = null;

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    function wasDismissedRecently() {
        try {
            const raw = localStorage.getItem(DISMISS_KEY);
            if (!raw) return false;
            const diff = Date.now() - Number(raw);
            return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
        } catch {
            return false;
        }
    }

    function markDismissed() {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            // Ignora erro de armazenamento
        }
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function isInAppBrowser() {
        return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger/i.test(navigator.userAgent);
    }

    function removeBanner() {
        const existing = document.getElementById('pwa-install-banner');
        if (existing) existing.remove();
    }

    function showBanner(mode) {
        if (isStandalone() || wasDismissedRecently()) return;
        if (document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Instalar aplicativo Encanto do Açaí');
        banner.style.cssText = [
            'position: fixed',
            'left: 16px',
            'right: 16px',
            'bottom: 84px',
            'z-index: 45',
            'max-width: 460px',
            'margin: 0 auto',
            'background: #380B4E',
            'color: #FFFFFF',
            'border: 2px solid #FFC107',
            'border-radius: 18px',
            'padding: 14px 16px',
            'box-shadow: 0 14px 32px rgba(0,0,0,0.28)',
            'display: flex',
            'align-items: center',
            'justify-content: space-between',
            'gap: 12px',
            'font-family: Montserrat, sans-serif',
        ].join(';');

        let title = 'Instale o App Encanto do Açaí';
        let subtitle = 'Acesso rápido na tela inicial, igual aplicativo.';
        let actionHtml = `
            <button id="pwa-btn-install" type="button" style="background:#FFC107;color:#380B4E;font-weight:700;border:none;border-radius:999px;padding:10px 16px;font-size:15px;cursor:pointer;white-space:nowrap;">
                Instalar
            </button>
        `;

        if (mode === 'ios') {
            subtitle = 'Toque em Compartilhar (⬆) e escolha "Adicionar à Tela de Início".';
            actionHtml = '';
        } else if (mode === 'inapp') {
            title = 'Abra no navegador para instalar';
            subtitle = 'No menu (⋮), toque em "Abrir no Chrome/Safari" para instalar o app.';
            actionHtml = '';
        }

        banner.innerHTML = `
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:16px;line-height:1.3;color:#FFC107;">${title}</div>
                <div style="font-size:14px;line-height:1.4;color:#F3E8FF;margin-top:2px;">${subtitle}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                ${actionHtml}
                <button id="pwa-btn-close" type="button" aria-label="Fechar aviso de instalação" style="background:rgba(255,255,255,0.14);color:#FFFFFF;border:none;border-radius:999px;width:36px;height:36px;font-size:18px;line-height:1;cursor:pointer;">
                    &times;
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        const btnClose = document.getElementById('pwa-btn-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                markDismissed();
                removeBanner();
            });
        }

        const btnInstall = document.getElementById('pwa-btn-install');
        if (btnInstall) {
            btnInstall.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                try {
                    const choice = await deferredPrompt.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        removeBanner();
                    }
                } finally {
                    deferredPrompt = null;
                }
            });
        }
    }

    if ('serviceWorker' in navigator && /^https?:/.test(window.location.protocol)) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then((registration) => {
                    registration.update().catch(() => {});
                })
                .catch((err) => {
                    console.warn('Falha ao registrar Service Worker do PWA:', err);
                });
        });
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        showBanner('prompt');
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        removeBanner();
    });

    window.addEventListener('DOMContentLoaded', () => {
        if (isStandalone()) return;
        if (isInAppBrowser()) {
            showBanner('inapp');
        } else if (isIOS()) {
            showBanner('ios');
        }
    });
})();
