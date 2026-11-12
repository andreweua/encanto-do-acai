/**
 * Acompanhamento público de pedido e fila em tempo real.
 */
(() => {
    const config = window.ENCANTO_CONFIG;
    const STORAGE_ULTIMO_PEDIDO = 'encanto_ultimo_pedido';

    const el = {};
    let numeroAtual = '';
    let timerAuto = null;

    function mapearElementos() {
        el.formBusca = document.getElementById('form-buscar-pedido');
        el.inputNumero = document.getElementById('input-numero-pedido');
        el.btnAtualizar = document.getElementById('btn-atualizar-fila');
        el.statusSync = document.getElementById('fila-status-sync');
        el.resultadoPedido = document.getElementById('resultado-meu-pedido');
        el.listaFila = document.getElementById('lista-fila-ao-vivo');
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

    function renderMeuPedido(pedido) {
        if (!numeroAtual) {
            el.resultadoPedido.innerHTML = `
                <div class="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm text-slate-500">
                    Digite o número do seu pedido acima (ex.: <strong>12112026-001</strong>) para ver o andamento e sua posição na fila.
                </div>
            `;
            return;
        }

        if (!pedido) {
            el.resultadoPedido.innerHTML = `
                <div class="bg-white rounded-3xl p-6 border border-red-200 text-center text-sm text-red-700 font-semibold">
                    Pedido <strong>#${escapeHtml(numeroAtual)}</strong> não encontrado. Confira o número no seu cupom do WhatsApp.
                </div>
            `;
            return;
        }

        const etapas = ['Aguardando Caixa', 'Em Preparo', 'Pronto', 'Concluído'];
        const indiceAtual = etapas.indexOf(pedido.status);
        const cancelado = pedido.status === 'Cancelado';

        let textoFila = '';
        if (cancelado) {
            textoFila = 'Pedido cancelado.';
        } else if (pedido.status === 'Pronto') {
            textoFila = pedido.tipoEntrega === 'Entrega'
                ? 'Seu açaí está pronto e aguardando/saindo para entrega!'
                : 'Seu açaí está PRONTO para retirada!';
        } else if (pedido.status === 'Concluído') {
            textoFila = 'Pedido entregue/finalizado. Obrigado!';
        } else if (pedido.pedidosNaFrente === 0) {
            textoFila = 'Você é o próximo da fila!';
        } else {
            textoFila = `${pedido.pedidosNaFrente} ${pedido.pedidosNaFrente === 1 ? 'pedido' : 'pedidos'} na sua frente (posição ${pedido.posicaoFila} da fila).`;
        }

        const passosHtml = cancelado
            ? '<div class="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm font-bold text-center">Pedido Cancelado</div>'
            : `
                <div class="grid grid-cols-4 gap-2 pt-2">
                    ${etapas.map((etapa, idx) => {
                        const concluido = idx <= indiceAtual;
                        const atual = idx === indiceAtual;
                        return `
                            <div class="text-center">
                                <div class="h-2 rounded-full mb-2 ${concluido ? 'bg-acai-magenta' : 'bg-slate-200'}"></div>
                                <span class="text-[11px] font-bold block ${atual ? 'text-acai-magenta' : concluido ? 'text-acai-dark' : 'text-slate-400'}">
                                    ${escapeHtml(etapa)}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

        const itensHtml = (pedido.itensResumo || []).map((it, idx) => `
            <li class="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-0.5">
                <strong class="text-acai-dark block">${idx + 1}. Copo ${escapeHtml(it.copoNome || 'Personalizado')} — ${escapeHtml(formatarMoeda(it.subtotal))}</strong>
                <span><strong>Grátis:</strong> ${it.gratisNomes && it.gratisNomes.length ? escapeHtml(it.gratisNomes.join(', ')) : 'Nenhum'}</span>
                ${it.pagosNomes && it.pagosNomes.length ? `<br><span><strong>Pagos:</strong> ${escapeHtml(it.pagosNomes.join(', '))}</span>` : ''}
                ${it.observacao ? `<br><span class="text-amber-800 font-semibold"><strong>Obs.:</strong> ${escapeHtml(it.observacao)}</span>` : ''}
            </li>
        `).join('');

        el.resultadoPedido.innerHTML = `
            <div class="bg-white rounded-3xl p-6 shadow-md border-2 border-acai-magenta space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-xs font-bold uppercase text-slate-400 block">Seu Pedido</span>
                        <h2 class="font-display text-2xl text-acai-dark">#${escapeHtml(pedido.numero)}</h2>
                    </div>
                    <span class="bg-acai-yellow text-acai-dark font-bold px-4 py-1.5 rounded-full text-xs uppercase">
                        ${escapeHtml(pedido.status)}
                    </span>
                </div>

                <p class="text-sm font-semibold text-acai-dark bg-purple-50 rounded-xl px-4 py-3 border border-acai-dark/10">
                    <i class="fa-solid fa-clock-rotate-left text-acai-magenta mr-2"></i>${escapeHtml(textoFila)}
                </p>

                ${passosHtml}

                ${itensHtml ? `<ul class="space-y-1.5 pt-2">${itensHtml}</ul>` : ''}

                <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>${escapeHtml(pedido.tipoEntrega)} • ${escapeHtml(pedido.dataHora)}</span>
                    <strong class="text-sm text-acai-dark">Total: ${escapeHtml(formatarMoeda(pedido.total))}</strong>
                </div>
            </div>
        `;
    }

    function renderFila(fila) {
        if (!Array.isArray(fila) || fila.length === 0) {
            el.listaFila.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">Nenhum pedido ativo na fila neste momento.</p>';
            return;
        }

        const badgeMap = {
            'Aguardando Caixa': 'bg-amber-100 text-amber-800',
            'Em Preparo': 'bg-blue-100 text-blue-800',
            'Pronto': 'bg-emerald-100 text-emerald-800',
        };

        el.listaFila.innerHTML = fila.map((item) => {
            const meu = numeroAtual && item.numero === numeroAtual;
            return `
                <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${meu ? 'border-acai-magenta bg-pink-50/60' : 'border-slate-200 bg-white'}">
                    <div>
                        <span class="font-display text-base text-acai-dark">#${escapeHtml(item.numero)}</span>
                        ${meu ? '<span class="ml-2 text-[10px] font-bold bg-acai-magenta text-white px-2 py-0.5 rounded-full">SEU</span>' : ''}
                        <span class="text-xs text-slate-400 block">${escapeHtml(item.tipoEntrega)} • ${escapeHtml(item.dataHora)}</span>
                    </div>
                    <span class="text-xs font-bold px-3 py-1 rounded-full ${badgeMap[item.status] || 'bg-slate-100 text-slate-600'}">
                        ${escapeHtml(item.status)}
                    </span>
                </div>
            `;
        }).join('');
    }

    async function atualizarFila() {
        const urlBase = String(config.APPS_SCRIPT_URL || '').trim();
        if (!urlBase) {
            el.statusSync.textContent = 'Integração não configurada.';
            return;
        }

        try {
            const sep = urlBase.includes('?') ? '&' : '?';
            const params = new URLSearchParams({
                action: 'fila',
                _t: String(Date.now()),
            });
            if (numeroAtual) params.set('numero', numeroAtual);

            const resp = await fetch(`${urlBase}${sep}${params.toString()}`, { cache: 'no-store' });
            const json = await resp.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Erro ao consultar fila');
            }

            renderMeuPedido(json.pedido);
            renderFila(json.fila);

            const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            el.statusSync.textContent = `Atualizado às ${hora}`;
        } catch (erro) {
            el.statusSync.textContent = erro.message || 'Falha ao atualizar fila.';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        mapearElementos();

        const params = new URLSearchParams(window.location.search);
        const paramNumero = (params.get('pedido') || '').trim();
        const salvo = (localStorage.getItem(STORAGE_ULTIMO_PEDIDO) || '').trim();
        numeroAtual = paramNumero || salvo;
        el.inputNumero.value = numeroAtual;

        el.formBusca.addEventListener('submit', (e) => {
            e.preventDefault();
            numeroAtual = el.inputNumero.value.trim();
            if (numeroAtual) {
                localStorage.setItem(STORAGE_ULTIMO_PEDIDO, numeroAtual);
            }
            atualizarFila();
        });

        el.btnAtualizar.addEventListener('click', atualizarFila);

        atualizarFila();
        timerAuto = setInterval(atualizarFila, 15000);
    });
})();
