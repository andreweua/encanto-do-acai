(() => {
    const STORAGE_KEY = 'encanto_pwa_instalacao_v2';
    const REMINDER_HOURS = 36;        // Relembra a cada 36h se ainda não instalou
    const REMINDER_VISITS = 4;        // Ou a cada 4 acessos sem instalar
    const MODAL_DELAY_MS = 1200;      // Tempo antes de exibir o pop-up inicial
    const HOUR_MS = 60 * 60 * 1000;

    let deferredPrompt = null;
    let modalAberto = false;

    /* ---------- Estado persistente ---------- */
    function lerEstado() {
        try {
            const bruto = localStorage.getItem(STORAGE_KEY);
            const estado = bruto ? JSON.parse(bruto) : {};
            return {
                modalVisto: Boolean(estado.modalVisto),
                ultimoLembrete: Number(estado.ultimoLembrete) || 0,
                acessosSemInstalar: Number(estado.acessosSemInstalar) || 0,
                naoLembrar: Boolean(estado.naoLembrar),
                instalado: Boolean(estado.instalado),
            };
        } catch {
            return {
                modalVisto: false,
                ultimoLembrete: 0,
                acessosSemInstalar: 0,
                naoLembrar: false,
                instalado: false,
            };
        }
    }

    function salvarEstado(parcial) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...lerEstado(), ...parcial }));
        } catch {
            // Ignora erro de armazenamento
        }
    }

    /* ---------- Ambiente ---------- */
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function isInAppBrowser() {
        return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger/i.test(navigator.userAgent);
    }

    function modoAtual() {
        if (isInAppBrowser()) return 'inapp';
        if (isIOS()) return 'ios';
        return deferredPrompt ? 'prompt' : null;
    }

    function textosPorModo(modo) {
        if (modo === 'ios') {
            return {
                titulo: 'Instale o App Encanto do Açaí',
                resumo: 'No iPhone/iPad, toque no botão Compartilhar (⬆) na barra do Safari e escolha "Adicionar à Tela de Início".',
                acao: null,
            };
        }
        if (modo === 'inapp') {
            return {
                titulo: 'Instale o App Encanto do Açaí',
                resumo: 'Você está no navegador interno. Toque no menu (⋮) no canto da tela, escolha "Abrir no Chrome" (ou Safari) e instale o aplicativo.',
                acao: null,
            };
        }
        return {
            titulo: 'Instale o App Encanto do Açaí',
            resumo: 'Tenha o cardápio direto na tela inicial do seu celular para pedir mais rápido e acompanhar a fila em tempo real.',
            acao: 'Instalar Aplicativo',
        };
    }

    /* ---------- Remoção de elementos ---------- */
    function removerModal() {
        const el = document.getElementById('pwa-install-modal');
        if (el) el.remove();
        modalAberto = false;
    }

    function removerPilulaDiscreta() {
        const el = document.getElementById('pwa-install-pill');
        if (el) el.remove();
    }

    /* ---------- Instalação ---------- */
    async function dispararInstalacao() {
        if (!deferredPrompt) return 'indisponivel';
        deferredPrompt.prompt();
        let resultado = 'dispensado';
        try {
            const escolha = await deferredPrompt.userChoice;
            if (escolha && escolha.outcome === 'accepted') resultado = 'aceito';
        } catch {
            // Ignora falha
        }
        deferredPrompt = null;
        if (resultado === 'aceito') {
            salvarEstado({ instalado: true });
            removerModal();
            removerPilulaDiscreta();
        }
        return resultado;
    }

    function naoLembrarMais() {
        salvarEstado({ naoLembrar: true, modalVisto: true });
        removerModal();
        removerPilulaDiscreta();
    }

    /* ---------- Pop-up maior (Modal centralizado) ---------- */
    function mostrarModal(ehRelembrete = false) {
        if (modalAberto || document.getElementById('pwa-install-modal')) return;
        const modo = modoAtual();
        if (!modo) return;
        const t = textosPorModo(modo);
        modalAberto = true;
        removerPilulaDiscreta();

        const overlay = document.createElement('div');
        overlay.id = 'pwa-install-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'pwa-modal-titulo');
        overlay.style.cssText = [
            'position: fixed', 'inset: 0', 'z-index: 70',
            'background: rgba(20, 4, 30, 0.75)',
            'backdrop-filter: blur(4px)',
            'display: flex', 'align-items: center', 'justify-content: center',
            'padding: 16px', 'overflow-y: auto',
            'font-family: Montserrat, sans-serif',
        ].join(';');

        const seloTopo = ehRelembrete
            ? '<span style="display:inline-block;background:rgba(255,193,7,0.2);color:#FFC107;border:1.5px solid rgba(255,193,7,0.55);font-size:1.02rem;font-weight:700;padding:6px 16px;border-radius:999px;margin-bottom:12px;">Dica rápida</span>'
            : '';

        const botaoPrincipal = t.acao
            ? `<button id="pwa-modal-instalar" type="button" style="width:100%;background:#FFC107;color:#380B4E;font-weight:800;border:none;border-radius:999px;padding:18px 24px;font-size:1.25rem;cursor:pointer;box-shadow:0 8px 22px rgba(255,193,7,0.35);">${t.acao}</button>`
            : '';
        const textoOk = t.acao ? 'OK, deixar para depois' : 'OK, entendi';

        overlay.innerHTML = `
            <div style="background:linear-gradient(160deg,#380B4E 0%,#240633 100%);color:#FFFFFF;border:4px solid #FFC107;border-radius:28px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:32px 24px 26px;box-shadow:0 24px 60px rgba(0,0,0,0.6);text-align:center;box-sizing:border-box;position:relative;">
                <button id="pwa-modal-fechar-x" type="button" aria-label="Fechar" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.16);color:#FFFFFF;border:none;border-radius:999px;width:44px;height:44px;font-size:1.5rem;line-height:1;cursor:pointer;">&times;</button>
                <div style="width:84px;height:84px;border-radius:22px;background:#FFFFFF;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,0.3);overflow:hidden;">
                    <img src="./assets/icon-192.png" alt="Encanto do Açaí" style="width:100%;height:100%;object-fit:cover;">
                </div>
                ${seloTopo}
                <h2 id="pwa-modal-titulo" style="font-family:'Lilita One',cursive;font-size:2.1rem;line-height:1.2;color:#FFC107;margin:0 0 14px;letter-spacing:0.02em;">${t.titulo}</h2>
                <p style="font-size:1.2rem;line-height:1.55;font-weight:500;color:#F3E8FF;margin:0 0 20px;overflow-wrap:break-word;">${t.resumo}</p>
                <ul style="list-style:none;padding:16px 18px;margin:0 0 22px;text-align:left;font-size:1.12rem;line-height:1.6;color:#FFFFFF;background:rgba(255,255,255,0.08);border-radius:18px;border:1px solid rgba(255,255,255,0.16);">
                    <li style="margin-bottom:8px;">⚡ <strong>Acesso imediato</strong> direto da tela inicial</li>
                    <li style="margin-bottom:8px;">🔔 <strong>Acompanhe a fila</strong> em tempo real</li>
                    <li>📱 <strong>Leve e rápido</strong>, sem ocupar memória</li>
                </ul>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    ${botaoPrincipal}
                    <button id="pwa-modal-depois" type="button" style="width:100%;background:rgba(255,255,255,0.16);color:#FFFFFF;font-weight:700;border:1.5px solid rgba(255,255,255,0.28);border-radius:999px;padding:16px 20px;font-size:1.15rem;cursor:pointer;">${textoOk}</button>
                    <button id="pwa-modal-nunca" type="button" style="background:none;border:none;color:#E9D5FF;text-decoration:underline;font-weight:600;font-size:1.08rem;padding:10px;cursor:pointer;">Não lembrar novamente</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        salvarEstado({
            modalVisto: true,
            ultimoLembrete: Date.now(),
            acessosSemInstalar: 0,
        });

        function recolherParaModoDiscreto() {
            removerModal();
            mostrarPilulaDiscreta();
        }

        const btnInstalar = document.getElementById('pwa-modal-instalar');
        const btnDepois = document.getElementById('pwa-modal-depois');
        const btnFecharX = document.getElementById('pwa-modal-fechar-x');
        const btnNunca = document.getElementById('pwa-modal-nunca');

        if (btnInstalar) {
            btnInstalar.addEventListener('click', async () => {
                const resultado = await dispararInstalacao();
                if (resultado !== 'aceito') recolherParaModoDiscreto();
            });
        }
        if (btnDepois) btnDepois.addEventListener('click', recolherParaModoDiscreto);
        if (btnFecharX) btnFecharX.addEventListener('click', recolherParaModoDiscreto);
        if (btnNunca) btnNunca.addEventListener('click', naoLembrarMais);
        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) recolherParaModoDiscreto();
        });
    }

    /* ---------- Botão/pílula discreta no canto ---------- */
    function mostrarPilulaDiscreta() {
        if (document.getElementById('pwa-install-pill') || modalAberto) return;
        const estado = lerEstado();
        if (estado.instalado || estado.naoLembrar || isStandalone()) return;
        const modo = modoAtual();
        if (!modo) return;

        const pill = document.createElement('div');
        pill.id = 'pwa-install-pill';
        pill.setAttribute('role', 'region');
        pill.setAttribute('aria-label', 'Atalho discreto para instalar o aplicativo');
        pill.style.cssText = [
            'position: fixed',
            'left: 14px',
            'bottom: 84px',
            'z-index: 44',
            'background: rgba(56, 11, 78, 0.96)',
            'color: #FFFFFF',
            'border: 2px solid #FFC107',
            'border-radius: 999px',
            'padding: 8px 10px 8px 16px',
            'box-shadow: 0 8px 22px rgba(0,0,0,0.32)',
            'display: inline-flex',
            'align-items: center',
            'gap: 10px',
            'font-family: Montserrat, sans-serif',
            'max-width: calc(100vw - 96px)',
            'box-sizing: border-box',
        ].join(';');

        pill.innerHTML = `
            <button id="pwa-pill-abrir" type="button" style="background:none;border:none;color:#FFC107;font-weight:700;font-size:1.05rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:4px 2px;min-height:36px;white-space:nowrap;">
                <span aria-hidden="true">📲</span>
                <span>Baixar App</span>
            </button>
            <button id="pwa-pill-fechar" type="button" title="Ocultar agora" aria-label="Ocultar atalho de instalação" style="background:rgba(255,255,255,0.16);color:#FFFFFF;border:none;border-radius:999px;width:34px;height:34px;min-height:34px;font-size:1.2rem;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">&times;</button>
        `;

        document.body.appendChild(pill);

        document.getElementById('pwa-pill-abrir').addEventListener('click', async () => {
            if (deferredPrompt) {
                const res = await dispararInstalacao();
                if (res !== 'aceito') mostrarModal(true);
            } else {
                mostrarModal(true);
            }
        });

        document.getElementById('pwa-pill-fechar').addEventListener('click', () => {
            salvarEstado({ ultimoLembrete: Date.now() });
            removerPilulaDiscreta();
        });
    }

    /* ---------- Decisão de quando exibir pop-up ou pílula discreta ---------- */
    let sessaoContabilizada = false;

    function avaliarExibicao() {
        if (isStandalone()) return;
        const estado = lerEstado();
        if (estado.instalado || estado.naoLembrar) return;
        if (!modoAtual()) return;

        let acessos = estado.acessosSemInstalar;
        if (!sessaoContabilizada) {
            sessaoContabilizada = true;
            acessos += 1;
            salvarEstado({ acessosSemInstalar: acessos });
        }

        // 1ª vez: abre o pop-up grande
        if (!estado.modalVisto) {
            window.setTimeout(() => {
                const atual = lerEstado();
                if (!atual.modalVisto && !atual.naoLembrar && !atual.instalado) {
                    mostrarModal(false);
                }
            }, MODAL_DELAY_MS);
            return;
        }

        // De vez em quando (após 36h ou 4 visitas sem baixar): reabre o pop-up de lembrete
        const tempoDecorrido = Date.now() - estado.ultimoLembrete;
        const deveRelembrar = tempoDecorrido >= REMINDER_HOURS * HOUR_MS || acessos >= REMINDER_VISITS;

        if (deveRelembrar) {
            window.setTimeout(() => {
                const atual = lerEstado();
                if (!atual.naoLembrar && !atual.instalado) {
                    mostrarModal(true);
                }
            }, MODAL_DELAY_MS);
        } else {
            // Nos demais acessos, fica apenas a pílula discreta no canto
            mostrarPilulaDiscreta();
        }
    }

    /* ---------- Service Worker ---------- */
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
        avaliarExibicao();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        salvarEstado({ instalado: true });
        removerModal();
        removerPilulaDiscreta();
    });

    window.addEventListener('DOMContentLoaded', () => {
        if (isInAppBrowser() || isIOS()) {
            avaliarExibicao();
        }
    });
})();
