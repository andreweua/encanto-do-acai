/**
 * Lógica compartilhada dos painéis Caixa e Cozinha.
 */
(() => {
    const config = window.ENCANTO_CONFIG;
    const STORAGE_URL_KEY = 'encanto_apps_script_url';
    const SESSION_PIN_KEY = 'encanto_admin_pin';

    const state = {
        modo: document.body.dataset.modoPainel || 'caixa',
        pedidos: [],
        carregando: false,
        atualizadoEm: null,
        timerAuto: null,
    };

    const el = {};

    function mapearElementos() {
        el.inputPin = document.getElementById('painel-pin');
        el.btnConectar = document.getElementById('btn-painel-conectar');
        el.btnAtualizar = document.getElementById('btn-painel-atualizar');
        el.statusTexto = document.getElementById('painel-status-texto');
        el.conteudo = document.getElementById('painel-conteudo');
        el.toast = document.getElementById('painel-toast');
    }

    function escapeHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    }

    function obterScriptUrl() {
        return (localStorage.getItem(STORAGE_URL_KEY) || config.APPS_SCRIPT_URL || '').trim();
    }

    function obterPin() {
        return (el.inputPin?.value || sessionStorage.getItem(SESSION_PIN_KEY) || '').trim();
    }

    function mostrarToast(mensagem, tipo = 'info') {
        if (!el.toast) return;
        el.toast.textContent = mensagem;
        el.toast.classList.remove(
            'opacity-0',
            'translate-y-4',
            'pointer-events-none',
            'bg-acai-dark',
            'bg-emerald-700',
            'bg-red-700',
        );
        if (tipo === 'sucesso') el.toast.classList.add('bg-emerald-700');
        else if (tipo === 'erro') el.toast.classList.add('bg-red-700');
        else el.toast.classList.add('bg-acai-dark');

        clearTimeout(mostrarToast._timer);
        mostrarToast._timer = setTimeout(() => {
            el.toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
        }, 3500);
    }

    function atualizarStatusBadge(texto, tipo = 'neutro') {
        if (!el.statusTexto) return;
        el.statusTexto.textContent = texto;
        el.statusTexto.className = 'text-xs font-semibold px-3 py-1.5 rounded-full ';
        if (tipo === 'ok') el.statusTexto.className += 'bg-emerald-100 text-emerald-800';
        else if (tipo === 'erro') el.statusTexto.className += 'bg-red-100 text-red-800';
        else el.statusTexto.className += 'bg-amber-100 text-amber-800';
    }

    async function carregarPedidos(silencioso = false) {
        const urlBase = obterScriptUrl();
        const pin = obterPin();

        if (!urlBase) {
            atualizarStatusBadge('APPS_SCRIPT_URL não configurada', 'erro');
            return;
        }
        if (!pin) {
            atualizarStatusBadge('Digite o PIN para carregar os pedidos', 'alerta');
            el.conteudo.innerHTML = `
                <div class="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm text-slate-500">
                    Informe o <strong>PIN de Administrador</strong> acima e clique em <strong>Entrar</strong> para visualizar os pedidos em tempo real.
                </div>
            `;
            return;
        }

        if (state.carregando) return;
        state.carregando = true;
        sessionStorage.setItem(SESSION_PIN_KEY, pin);

        try {
            const sep = urlBase.includes('?') ? '&' : '?';
            const url = `${urlBase}${sep}action=pedidos&pin=${encodeURIComponent(pin)}&_t=${Date.now()}`;
            const resp = await fetch(url, { cache: 'no-store' });
            const json = await resp.json();

            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Falha ao carregar pedidos.');
            }

            state.pedidos = Array.isArray(json.pedidos) ? json.pedidos : [];
            state.atualizadoEm = new Date();
            const hora = state.atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            atualizarStatusBadge(`Sincronizado às ${hora}`, 'ok');
            renderizar();
            if (!silencioso) mostrarToast('Pedidos atualizados!', 'sucesso');
        } catch (erro) {
            atualizarStatusBadge(erro.message || 'Erro ao carregar', 'erro');
            if (!silencioso) mostrarToast(erro.message || 'Erro ao carregar pedidos.', 'erro');
        } finally {
            state.carregando = false;
        }
    }

    async function alterarStatusPedido(numero, novoStatus) {
        const urlBase = obterScriptUrl();
        const pin = obterPin();
        if (!urlBase || !pin) {
            mostrarToast('Informe o PIN primeiro.', 'erro');
            return;
        }

        try {
            const resp = await fetch(urlBase, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'atualizar_status',
                    pin,
                    numero,
                    status: novoStatus,
                }),
            });
            const json = await resp.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Não foi possível atualizar o status.');
            }

            const extra = json.estoqueBaixadoAgora ? ' (Estoque baixado automaticamente!)' : '';
            mostrarToast(`Pedido #${numero} → ${novoStatus}${extra}`, 'sucesso');
            await carregarPedidos(true);
        } catch (erro) {
            mostrarToast(erro.message || 'Erro ao atualizar pedido.', 'erro');
        }
    }

    function montarLinkWhatsappCliente(pedido) {
        const baseAcompanhar = new URL('./acompanhar.html', window.location.href);
        baseAcompanhar.searchParams.set('pedido', pedido.numero);

        const texto = [
            `Olá, ${pedido.clienteNome || 'cliente'}! 🍇`,
            `Seu pedido *#${pedido.numero}* no *Encanto do Açaí* está *PRONTO* (${pedido.tipoEntrega})!`,
            `Total: *${formatarMoeda(pedido.total)}* (${pedido.pagamento})`,
            '',
            `Acompanhe aqui: ${baseAcompanhar.toString()}`,
        ].join('\n');

        const digitos = String(pedido.clienteWhatsapp || '').replace(/\D/g, '');
        if (digitos.length >= 10) {
            const numeroComDdi = digitos.startsWith('55') ? digitos : `55${digitos}`;
            return `https://wa.me/${numeroComDdi}?text=${encodeURIComponent(texto)}`;
        }
        return `https://wa.me/?text=${encodeURIComponent(texto)}`;
    }

    function renderItensPedidoHtml(itens) {
        if (!Array.isArray(itens) || itens.length === 0) {
            return '<p class="text-xs text-slate-400">Sem itens detalhados.</p>';
        }

        return itens.map((it, idx) => `
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-sm text-acai-dark">${idx + 1}. Copo ${escapeHtml(it.copoNome)}</span>
                    <span class="font-bold text-xs text-acai-magenta">${escapeHtml(formatarMoeda(it.subtotal))}</span>
                </div>
                <p class="text-xs text-slate-600">
                    <strong>Grátis:</strong> ${(it.gratisNomes && it.gratisNomes.length) ? escapeHtml(it.gratisNomes.join(', ')) : 'Nenhum'}
                </p>
                ${(it.pagosNomes && it.pagosNomes.length) ? `
                    <p class="text-xs text-slate-600"><strong>Pagos:</strong> ${escapeHtml(it.pagosNomes.join(', '))}</p>
                ` : ''}
                ${it.observacao ? `
                    <p class="text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg px-2.5 py-1 mt-1">
                        Obs: ${escapeHtml(it.observacao)}
                    </p>
                ` : ''}
            </div>
        `).join('');
    }

    function renderCardPedidoCaixa(p) {
        const badges = {
            'Aguardando Caixa': 'bg-amber-100 text-amber-800',
            'Em Preparo': 'bg-blue-100 text-blue-800',
            'Pronto': 'bg-emerald-100 text-emerald-800',
            'Concluído': 'bg-slate-200 text-slate-700',
            'Cancelado': 'bg-red-100 text-red-700',
        };
        const badgeCls = badges[p.status] || 'bg-slate-100 text-slate-700';

        let acoes = '';
        if (p.status === 'Aguardando Caixa') {
            acoes = `
                <button type="button" data-acao-status="Em Preparo" data-numero="${escapeHtml(p.numero)}" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    <i class="fa-solid fa-check mr-1"></i> Confirmar &amp; Baixar Estoque
                </button>
                <button type="button" data-acao-status="Cancelado" data-numero="${escapeHtml(p.numero)}" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs px-3 py-2.5 rounded-xl transition-colors cursor-pointer">
                    Cancelar
                </button>
            `;
        } else if (p.status === 'Em Preparo') {
            acoes = `
                <button type="button" data-acao-status="Pronto" data-numero="${escapeHtml(p.numero)}" class="flex-1 bg-acai-cyan hover:bg-teal-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    <i class="fa-solid fa-bell mr-1"></i> Marcar Pronto
                </button>
            `;
        } else if (p.status === 'Pronto') {
            const linkWa = montarLinkWhatsappCliente(p);
            acoes = `
                <a href="${escapeHtml(linkWa)}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">
                    <i class="fa-brands fa-whatsapp text-base"></i> Enviar ao Cliente
                </a>
                <button type="button" data-acao-status="Concluído" data-numero="${escapeHtml(p.numero)}" class="bg-acai-dark hover:bg-purple-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    Finalizar
                </button>
            `;
        }

        return `
            <article class="bg-white rounded-2xl border ${p.status === 'Pronto' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200'} p-4 shadow-sm space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <span class="font-display text-lg text-acai-dark">#${escapeHtml(p.numero)}</span>
                        <span class="text-xs text-slate-400 block">${escapeHtml(p.dataHora)}</span>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeCls}">${escapeHtml(p.status)}</span>
                        <span class="text-[10px] font-semibold ${p.estoqueBaixado ? 'text-emerald-700' : 'text-slate-400'}">
                            ${p.estoqueBaixado ? 'Estoque baixado' : 'Estoque não baixado'}
                        </span>
                    </div>
                </div>

                <div class="text-xs text-slate-700 space-y-1 border-y border-slate-100 py-2">
                    <p><strong>Cliente:</strong> ${escapeHtml(p.clienteNome || 'Não informado')} ${p.clienteWhatsapp ? `• ${escapeHtml(p.clienteWhatsapp)}` : ''}</p>
                    <p><strong>${escapeHtml(p.tipoEntrega)}:</strong> ${p.tipoEntrega === 'Entrega' ? escapeHtml(p.endereco || '-') : 'Retirar no local'}</p>
                    <p><strong>Pagamento:</strong> ${escapeHtml(p.pagamento)}${p.troco ? ` (Troco: ${escapeHtml(p.troco)})` : ''} • <strong class="text-acai-magenta">${escapeHtml(formatarMoeda(p.total))}</strong></p>
                </div>

                <div class="space-y-2">${renderItensPedidoHtml(p.itens)}</div>

                ${acoes ? `<div class="flex flex-wrap gap-2 pt-1">${acoes}</div>` : ''}
            </article>
        `;
    }

    function renderCardPedidoCozinha(p) {
        const aguardandoCaixa = p.status === 'Aguardando Caixa';
        return `
            <article class="bg-white rounded-2xl border-2 ${aguardandoCaixa ? 'border-amber-300' : 'border-acai-cyan'} p-5 shadow-md space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <div>
                        <span class="font-display text-2xl text-acai-dark">#${escapeHtml(p.numero)}</span>
                        <span class="text-xs text-slate-500 ml-2">${escapeHtml(p.dataHora)}</span>
                    </div>
                    <span class="text-xs font-bold px-3 py-1 rounded-full ${aguardandoCaixa ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">
                        ${aguardandoCaixa ? 'Aguardando Caixa' : 'Em Preparo'}
                    </span>
                </div>

                <p class="text-xs font-semibold text-slate-600">
                    Cliente: <strong class="text-slate-800">${escapeHtml(p.clienteNome || 'Cliente')}</strong> • ${escapeHtml(p.tipoEntrega)}
                </p>

                <div class="space-y-2">${renderItensPedidoHtml(p.itens)}</div>

                <div class="pt-2">
                    <button
                        type="button"
                        data-acao-status="Pronto"
                        data-numero="${escapeHtml(p.numero)}"
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                        <i class="fa-solid fa-check-double"></i>
                        Confirmar Pedido Pronto (Enviar para Caixa)
                    </button>
                </div>
            </article>
        `;
    }

    function renderizar() {
        const lista = [...state.pedidos].reverse();

        if (state.modo === 'cozinha') {
            const emPreparo = lista.filter((p) => p.status === 'Em Preparo');
            const aguardando = lista.filter((p) => p.status === 'Aguardando Caixa');

            el.conteudo.innerHTML = `
                <div class="grid lg:grid-cols-2 gap-6">
                    <section class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h2 class="font-display text-xl text-acai-dark">EM PREPARO (${emPreparo.length})</h2>
                            <span class="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">Confirmados pelo Caixa</span>
                        </div>
                        ${emPreparo.length ? emPreparo.map(renderCardPedidoCozinha).join('') : '<div class="bg-white rounded-2xl p-6 text-center text-sm text-slate-400 border border-slate-200">Nenhum pedido em preparo no momento.</div>'}
                    </section>

                    <section class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h2 class="font-display text-xl text-acai-dark">CHEGANDO AGORA (${aguardando.length})</h2>
                            <span class="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">Aguardando Caixa</span>
                        </div>
                        ${aguardando.length ? aguardando.map(renderCardPedidoCozinha).join('') : '<div class="bg-white rounded-2xl p-6 text-center text-sm text-slate-400 border border-slate-200">Nenhum pedido novo aguardando.</div>'}
                    </section>
                </div>
            `;
            return;
        }

        // Modo Caixa
        const novos = lista.filter((p) => p.status === 'Aguardando Caixa');
        const prontos = lista.filter((p) => p.status === 'Pronto');
        const preparo = lista.filter((p) => p.status === 'Em Preparo');
        const historico = lista.filter((p) => p.status === 'Concluído' || p.status === 'Cancelado').slice(0, 15);

        el.conteudo.innerHTML = `
            <div class="grid lg:grid-cols-3 gap-6">
                <section class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="font-display text-xl text-acai-dark">NOVOS (${novos.length})</h2>
                        <span class="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">Baixar Estoque</span>
                    </div>
                    ${novos.length ? novos.map(renderCardPedidoCaixa).join('') : '<div class="bg-white rounded-2xl p-6 text-center text-sm text-slate-400 border border-slate-200">Nenhum pedido novo.</div>'}
                </section>

                <section class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="font-display text-xl text-acai-dark">PRONTOS (${prontos.length})</h2>
                        <span class="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">Enviar p/ Cliente</span>
                    </div>
                    ${prontos.length ? prontos.map(renderCardPedidoCaixa).join('') : '<div class="bg-white rounded-2xl p-6 text-center text-sm text-slate-400 border border-slate-200">Nenhum pedido pronto ainda.</div>'}
                </section>

                <section class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="font-display text-xl text-acai-dark">NA COZINHA (${preparo.length})</h2>
                        <span class="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">Em Preparo</span>
                    </div>
                    ${preparo.length ? preparo.map(renderCardPedidoCaixa).join('') : '<div class="bg-white rounded-2xl p-6 text-center text-sm text-slate-400 border border-slate-200">Cozinha livre.</div>'}
                </section>
            </div>

            ${historico.length ? `
                <details class="mt-8 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <summary class="font-bold text-sm text-acai-dark cursor-pointer">Histórico recente (${historico.length})</summary>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        ${historico.map(renderCardPedidoCaixa).join('')}
                    </div>
                </details>
            ` : ''}
        `;
    }

    function registrarEventos() {
        el.btnConectar.addEventListener('click', () => carregarPedidos(false));
        el.btnAtualizar.addEventListener('click', () => carregarPedidos(false));

        el.inputPin.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                carregarPedidos(false);
            }
        });

        el.conteudo.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-acao-status]');
            if (!btn) return;
            const numero = btn.dataset.numero;
            const novoStatus = btn.dataset.acaoStatus;
            btn.disabled = true;
            alterarStatusPedido(numero, novoStatus).finally(() => {
                btn.disabled = false;
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        mapearElementos();
        el.inputPin.value = sessionStorage.getItem(SESSION_PIN_KEY) || '';
        registrarEventos();
        carregarPedidos(true);
        state.timerAuto = setInterval(() => {
            if (obterPin()) carregarPedidos(true);
        }, 15000);
    });
})();
