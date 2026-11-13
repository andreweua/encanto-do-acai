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
        empresa: null,
        catalogo: [],
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
            if (json.empresa) {
                state.empresa = json.empresa;
            }
            if (state.catalogo.length === 0 && window.EncantoEstoque?.carregarCatalogo) {
                try {
                    const cat = await window.EncantoEstoque.carregarCatalogo(config);
                    state.catalogo = Array.isArray(cat.produtos) ? cat.produtos : [];
                } catch {
                    state.catalogo = config.CATALOGO_PADRAO || [];
                }
            }
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

            const extra = json.estoqueBaixadoAgora
                ? ' (Estoque baixado automaticamente!)'
                : json.estoqueEstornadoAgora
                    ? ' (Estoque estornado automaticamente!)'
                    : '';
            mostrarToast(`Pedido #${numero} → ${novoStatus}${extra}`, 'sucesso');
            await carregarPedidos(true);
        } catch (erro) {
            mostrarToast(erro.message || 'Erro ao atualizar pedido.', 'erro');
        }
    }

    async function salvarEdicaoPedido(numero, dadosPedido) {
        const urlBase = obterScriptUrl();
        const pin = obterPin();
        if (!urlBase || !pin) {
            mostrarToast('Informe o PIN primeiro.', 'erro');
            return false;
        }

        try {
            const resp = await fetch(urlBase, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'editar_pedido',
                    pin,
                    numero,
                    pedido: dadosPedido,
                }),
            });
            const json = await resp.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Não foi possível editar o pedido.');
            }
            mostrarToast(`Pedido #${numero} atualizado!`, 'sucesso');
            await carregarPedidos(true);
            return true;
        } catch (erro) {
            mostrarToast(erro.message || 'Erro ao editar pedido.', 'erro');
            return false;
        }
    }

    function montarUrlWhatsapp(telefone, texto) {
        const digitos = String(telefone || '').replace(/\D/g, '');
        if (digitos.length >= 10) {
            const numeroComDdi = digitos.startsWith('55') ? digitos : `55${digitos}`;
            return `https://wa.me/${numeroComDdi}?text=${encodeURIComponent(texto)}`;
        }
        return `https://wa.me/?text=${encodeURIComponent(texto)}`;
    }

    function montarLinkWhatsappCliente(pedido) {
        const baseAcompanhar = new URL(`./f/?${encodeURIComponent(pedido.numero)}`, window.location.href);

        const texto = [
            `Olá, ${pedido.clienteNome || 'cliente'}! 🍇`,
            `Seu pedido *#${pedido.numero}* no *Encanto do Açaí* está *PRONTO* (${pedido.tipoEntrega})!`,
            `Total: *${formatarMoeda(pedido.total)}* (${pedido.pagamento})`,
            '',
            `Acompanhe aqui: ${baseAcompanhar.toString()}`,
        ].join('\n');

        return montarUrlWhatsapp(pedido.clienteWhatsapp, texto);
    }

    function montarLinkConversaPagamento(pedido) {
        const texto = [
            `Olá, ${pedido.clienteNome || 'cliente'}! Tudo bem? 😊`,
            `Recebemos seu pedido *#${pedido.numero}* no *${state.empresa?.nomeLoja || 'Encanto do Açaí'}* no valor de *${formatarMoeda(pedido.total)}*.`,
            `Qual será a forma de pagamento? (*PIX*, *Cartão de Débito/Crédito* ou *Dinheiro*)`,
        ].join('\n');
        return montarUrlWhatsapp(pedido.clienteWhatsapp, texto);
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
        const ativo = p.status !== 'Concluído' && p.status !== 'Cancelado';
        const opcoesPgto = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];
        const linkConversa = montarLinkConversaPagamento(p);

        let acoes = '';
        if (p.status === 'Aguardando Caixa') {
            acoes = `
                <button type="button" data-acao-status="Em Preparo" data-numero="${escapeHtml(p.numero)}" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    <i class="fa-solid fa-check mr-1"></i> Confirmar &amp; Baixar Estoque
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
                    <i class="fa-brands fa-whatsapp text-base"></i> Avisar Pronto
                </a>
                <button type="button" data-acao-status="Concluído" data-numero="${escapeHtml(p.numero)}" class="bg-acai-dark hover:bg-purple-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    Finalizar
                </button>
            `;
        }

        const gerenciaPgto = ativo ? `
            <div class="rounded-xl bg-purple-50/70 border border-acai-dark/10 p-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold uppercase text-acai-dark">Gerenciar Pagamento</span>
                    <a href="${escapeHtml(linkConversa)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 hover:underline">
                        <i class="fa-brands fa-whatsapp"></i> Perguntar no WhatsApp
                    </a>
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <select data-select-pgto="${escapeHtml(p.numero)}" class="flex-1 min-w-[130px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-acai-dark">
                        ${opcoesPgto.map((op) => `<option value="${escapeHtml(op)}" ${p.pagamento === op ? 'selected' : ''}>${escapeHtml(op)}</option>`).join('')}
                        ${!opcoesPgto.includes(p.pagamento) && p.pagamento ? `<option value="${escapeHtml(p.pagamento)}" selected>${escapeHtml(p.pagamento)}</option>` : ''}
                    </select>
                    <input type="text" data-input-troco="${escapeHtml(p.numero)}" value="${escapeHtml(p.troco || '')}" placeholder="Troco (se dinheiro)" class="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs">
                    <button type="button" data-acao-salvar-pgto="${escapeHtml(p.numero)}" class="bg-acai-dark hover:bg-purple-950 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer">
                        Salvar
                    </button>
                </div>
                ${String(p.pagamento || '').toLowerCase().includes('pix') ? `
                    <button type="button" data-acao-pix="${escapeHtml(p.numero)}" class="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer">
                        <i class="fa-solid fa-qrcode"></i> Gerar PIX &amp; Enviar no WhatsApp
                    </button>
                ` : ''}
            </div>
        ` : '';

        const botoesEdicaoCancelamento = ativo ? `
            <div class="flex gap-2 pt-1 border-t border-slate-100">
                <button type="button" data-acao-editar="${escapeHtml(p.numero)}" class="flex-1 bg-slate-100 hover:bg-slate-200 text-acai-dark font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer">
                    <i class="fa-solid fa-pen-to-square mr-1"></i> Editar Pedido
                </button>
                <button type="button" data-acao-cancelar="${escapeHtml(p.numero)}" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer">
                    <i class="fa-solid fa-ban mr-1"></i> Cancelar
                </button>
            </div>
        ` : '';

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

                ${gerenciaPgto}
                ${acoes ? `<div class="flex flex-wrap gap-2 pt-1">${acoes}</div>` : ''}
                ${botoesEdicaoCancelamento}
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

    function abrirModalPix(pedido, empresaCustom = null) {
        const empresa = empresaCustom || state.empresa || {};
        if (!window.EncantoPix?.gerarPixCopiaECola) {
            mostrarToast('Módulo PIX não carregado.', 'erro');
            return;
        }
        let codigoPix = '';
        try {
            codigoPix = window.EncantoPix.gerarPixCopiaECola({
                chave: empresa.pixChave,
                titular: empresa.pixTitular || empresa.nomeLoja || 'ENCANTO DO ACAI',
                cidade: empresa.pixCidade || 'BRASIL',
                valor: pedido.total,
                txid: `PED${String(pedido.numero || '').replace(/\D/g, '')}`,
            });
        } catch (erro) {
            mostrarToast(erro.message || 'Configure a chave PIX no Admin > Dados da Empresa.', 'erro');
            return;
        }

        const textoWa = [
            `Olá, ${pedido.clienteNome || 'cliente'}! 🍇`,
            `Segue o *PIX Copia e Cola* do seu pedido *#${pedido.numero}* no *${empresa.nomeLoja || 'Encanto do Açaí'}*:`,
            `Valor: *${formatarMoeda(pedido.total)}*`,
            '',
            codigoPix,
            '',
            'Basta copiar o código acima e colar na opção *Pix Copia e Cola* do aplicativo do seu banco.',
        ].join('\n');
        const linkWa = montarUrlWhatsapp(pedido.clienteWhatsapp, textoWa);

        const existente = document.getElementById('modal-pix-dinamico');
        if (existente) existente.remove();

        const overlay = document.createElement('div');
        overlay.id = 'modal-pix-dinamico';
        overlay.className = 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="font-display text-xl text-acai-dark">PIX • #${escapeHtml(pedido.numero)}</h3>
                    <button type="button" data-fechar-modal class="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer">✕</button>
                </div>
                <p class="text-sm text-slate-600">Valor a cobrar: <strong class="text-acai-magenta text-base">${escapeHtml(formatarMoeda(pedido.total))}</strong></p>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">PIX Copia e Cola</label>
                    <textarea readonly rows="4" class="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-800">${escapeHtml(codigoPix)}</textarea>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <button type="button" data-copiar-pix class="flex-1 bg-acai-dark hover:bg-purple-950 text-white font-bold text-xs px-4 py-3 rounded-xl cursor-pointer">
                        <i class="fa-regular fa-copy mr-1"></i> Copiar Código PIX
                    </button>
                    <a href="${escapeHtml(linkWa)}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-4 py-3 rounded-xl">
                        <i class="fa-brands fa-whatsapp text-base"></i> Enviar no WhatsApp
                    </a>
                </div>
            </div>
        `;
        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay || ev.target.closest('[data-fechar-modal]')) {
                overlay.remove();
            } else if (ev.target.closest('[data-copiar-pix]')) {
                navigator.clipboard?.writeText(codigoPix).then(
                    () => mostrarToast('Código PIX copiado!', 'sucesso'),
                    () => mostrarToast('Selecione e copie o código manualmente.', 'erro'),
                );
            }
        });
        document.body.appendChild(overlay);
    }

    function abrirModalEditar(pedido, catalogoLista = null, onSalvarCallback = null) {
        const catalogo = (Array.isArray(catalogoLista) && catalogoLista.length > 0)
            ? catalogoLista
            : (state.catalogo.length > 0 ? state.catalogo : (config.CATALOGO_PADRAO || []));
        const copos = catalogo.filter((p) => p.categoria === 'copo');
        const gratis = catalogo.filter((p) => p.categoria === 'adicional_gratis');
        const pagos = catalogo.filter((p) => p.categoria === 'adicional_pago');

        let itensEdit = (pedido.itens || []).map((it) => ({
            copoId: it.copoId || '',
            copoNome: it.copoNome || '',
            volumeMl: Number(it.volumeMl || 0),
            gratisIds: Array.isArray(it.gratisIds) ? [...it.gratisIds] : [],
            gratisNomes: Array.isArray(it.gratisNomes) ? [...it.gratisNomes] : [],
            pagosIds: Array.isArray(it.pagosIds) ? [...it.pagosIds] : [],
            pagosNomes: Array.isArray(it.pagosNomes) ? [...it.pagosNomes] : [],
            observacao: it.observacao || '',
            subtotal: Number(it.subtotal || 0),
        }));

        const existente = document.getElementById('modal-editar-pedido-dinamico');
        if (existente) existente.remove();

        const overlay = document.createElement('div');
        overlay.id = 'modal-editar-pedido-dinamico';
        overlay.className = 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto';

        function recalcularItem(it) {
            const copoObj = copos.find((c) => c.id === it.copoId) || copos[0];
            if (copoObj) {
                it.copoId = copoObj.id;
                it.copoNome = copoObj.nome;
                it.volumeMl = window.EncantoEstoque?.extrairVolumeMl ? window.EncantoEstoque.extrairVolumeMl(copoObj) : (parseInt(copoObj.nome, 10) || 0);
            }
            const gratisObjs = it.gratisIds.map((id) => gratis.find((g) => g.id === id)).filter(Boolean);
            it.gratisNomes = gratisObjs.map((g) => g.nome);
            const pagosObjs = it.pagosIds.map((id) => pagos.find((pg) => pg.id === id)).filter(Boolean);
            it.pagosNomes = pagosObjs.map((pg) => pg.nome);
            const somaPagos = pagosObjs.reduce((acc, pg) => acc + Number(pg.preco || 0), 0);
            it.subtotal = Number((copoObj ? copoObj.preco : 0) + somaPagos);
        }

        function renderItensEditor() {
            const cont = overlay.querySelector('[data-editor-itens]');
            const totalEl = overlay.querySelector('[data-editor-total]');
            let totalGeral = 0;

            cont.innerHTML = itensEdit.map((it, idx) => {
                recalcularItem(it);
                totalGeral += it.subtotal;
                return `
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2" data-item-idx="${idx}">
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-xs text-acai-dark">Copo ${idx + 1} (${escapeHtml(formatarMoeda(it.subtotal))})</span>
                            ${itensEdit.length > 1 ? `<button type="button" data-rem-item="${idx}" class="text-xs font-bold text-red-600 hover:underline cursor-pointer">Remover</button>` : ''}
                        </div>
                        <select data-item-copo="${idx}" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">
                            ${copos.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === it.copoId ? 'selected' : ''}>${escapeHtml(c.nome)} — ${escapeHtml(formatarMoeda(c.preco))}</option>`).join('')}
                        </select>
                        <div>
                            <span class="block text-[11px] font-bold text-slate-500 mb-1">Adicionais Grátis</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${gratis.map((g) => {
                                    const chk = it.gratisIds.includes(g.id);
                                    return `<label class="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer">
                                        <input type="checkbox" data-item-gratis="${idx}" value="${escapeHtml(g.id)}" ${chk ? 'checked' : ''}> ${escapeHtml(g.nome)}
                                    </label>`;
                                }).join('')}
                            </div>
                        </div>
                        <div>
                            <span class="block text-[11px] font-bold text-slate-500 mb-1">Adicionais Pagos</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${pagos.map((pg) => {
                                    const chk = it.pagosIds.includes(pg.id);
                                    return `<label class="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer">
                                        <input type="checkbox" data-item-pago="${idx}" value="${escapeHtml(pg.id)}" ${chk ? 'checked' : ''}> ${escapeHtml(pg.nome)} (+${escapeHtml(formatarMoeda(pg.preco))})
                                    </label>`;
                                }).join('')}
                            </div>
                        </div>
                        <input type="text" data-item-obs="${idx}" value="${escapeHtml(it.observacao)}" placeholder="Observação deste copo" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs">
                    </div>
                `;
            }).join('');

            totalEl.textContent = formatarMoeda(totalGeral);
        }

        const opcoesPgto = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];
        overlay.innerHTML = `
            <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-display text-xl text-acai-dark">EDITAR PEDIDO #${escapeHtml(pedido.numero)}</h3>
                    <button type="button" data-fechar-modal class="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer">✕</button>
                </div>

                <div class="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Nome do Cliente</label>
                        <input id="ed-nome" type="text" value="${escapeHtml(pedido.clienteNome || '')}" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">WhatsApp</label>
                        <input id="ed-whatsapp" type="tel" value="${escapeHtml(pedido.clienteWhatsapp || '')}" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Recebimento</label>
                        <select id="ed-entrega" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                            <option value="Entrega" ${pedido.tipoEntrega === 'Entrega' ? 'selected' : ''}>Entrega</option>
                            <option value="Retirada" ${pedido.tipoEntrega === 'Retirada' ? 'selected' : ''}>Retirada</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Pagamento</label>
                        <select id="ed-pagamento" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                            ${opcoesPgto.map((op) => `<option value="${escapeHtml(op)}" ${pedido.pagamento === op ? 'selected' : ''}>${escapeHtml(op)}</option>`).join('')}
                            ${!opcoesPgto.includes(pedido.pagamento) && pedido.pagamento ? `<option value="${escapeHtml(pedido.pagamento)}" selected>${escapeHtml(pedido.pagamento)}</option>` : ''}
                        </select>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-600 mb-1">Endereço</label>
                        <input id="ed-endereco" type="text" value="${escapeHtml(pedido.endereco || '')}" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-600 mb-1">Troco</label>
                        <input id="ed-troco" type="text" value="${escapeHtml(pedido.troco || '')}" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs uppercase text-acai-dark">Itens do Pedido</span>
                        <button type="button" data-add-item class="text-xs font-bold bg-acai-cyan text-white px-3 py-1.5 rounded-lg cursor-pointer">+ Adicionar Copo</button>
                    </div>
                    <div data-editor-itens class="space-y-2.5"></div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div class="text-sm font-bold text-acai-dark">Total: <span data-editor-total class="text-acai-magenta text-lg">R$ 0,00</span></div>
                    <div class="flex gap-2">
                        <button type="button" data-fechar-modal class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">Fechar</button>
                        <button type="button" data-salvar-edicao class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        renderItensEditor();

        overlay.addEventListener('change', (ev) => {
            const selCopo = ev.target.closest('select[data-item-copo]');
            if (selCopo) {
                itensEdit[Number(selCopo.dataset.itemCopo)].copoId = selCopo.value;
                renderItensEditor();
                return;
            }
            const chkGratis = ev.target.closest('input[data-item-gratis]');
            if (chkGratis) {
                const idx = Number(chkGratis.dataset.itemGratis);
                const id = chkGratis.value;
                if (chkGratis.checked) {
                    if (!itensEdit[idx].gratisIds.includes(id)) itensEdit[idx].gratisIds.push(id);
                } else {
                    itensEdit[idx].gratisIds = itensEdit[idx].gratisIds.filter((x) => x !== id);
                }
                renderItensEditor();
                return;
            }
            const chkPago = ev.target.closest('input[data-item-pago]');
            if (chkPago) {
                const idx = Number(chkPago.dataset.itemPago);
                const id = chkPago.value;
                if (chkPago.checked) {
                    if (!itensEdit[idx].pagosIds.includes(id)) itensEdit[idx].pagosIds.push(id);
                } else {
                    itensEdit[idx].pagosIds = itensEdit[idx].pagosIds.filter((x) => x !== id);
                }
                renderItensEditor();
            }
        });

        overlay.addEventListener('input', (ev) => {
            const inpObs = ev.target.closest('input[data-item-obs]');
            if (inpObs) {
                itensEdit[Number(inpObs.dataset.itemObs)].observacao = inpObs.value;
            }
        });

        overlay.addEventListener('click', async (ev) => {
            if (ev.target === overlay || ev.target.closest('[data-fechar-modal]')) {
                overlay.remove();
                return;
            }
            const btnRem = ev.target.closest('button[data-rem-item]');
            if (btnRem) {
                itensEdit.splice(Number(btnRem.dataset.remItem), 1);
                renderItensEditor();
                return;
            }
            if (ev.target.closest('button[data-add-item]')) {
                const primeiro = copos[0];
                itensEdit.push({
                    copoId: primeiro ? primeiro.id : '',
                    copoNome: primeiro ? primeiro.nome : '',
                    volumeMl: 0,
                    gratisIds: [],
                    gratisNomes: [],
                    pagosIds: [],
                    pagosNomes: [],
                    observacao: '',
                    subtotal: primeiro ? Number(primeiro.preco || 0) : 0,
                });
                renderItensEditor();
                return;
            }
            const btnSalvar = ev.target.closest('button[data-salvar-edicao]');
            if (btnSalvar) {
                btnSalvar.disabled = true;
                itensEdit.forEach(recalcularItem);
                const total = itensEdit.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
                const payload = {
                    clienteNome: overlay.querySelector('#ed-nome').value.trim(),
                    clienteWhatsapp: overlay.querySelector('#ed-whatsapp').value.trim(),
                    tipoEntrega: overlay.querySelector('#ed-entrega').value,
                    endereco: overlay.querySelector('#ed-endereco').value.trim(),
                    pagamento: overlay.querySelector('#ed-pagamento').value,
                    troco: overlay.querySelector('#ed-troco').value.trim(),
                    total,
                    itens: itensEdit,
                };
                const ok = await salvarEdicaoPedido(pedido.numero, payload);
                btnSalvar.disabled = false;
                if (ok) {
                    overlay.remove();
                    if (typeof onSalvarCallback === 'function') onSalvarCallback();
                }
            }
        });
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

        el.conteudo.addEventListener('click', async (e) => {
            const btnStatus = e.target.closest('button[data-acao-status]');
            if (btnStatus) {
                const numero = btnStatus.dataset.numero;
                const novoStatus = btnStatus.dataset.acaoStatus;
                btnStatus.disabled = true;
                await alterarStatusPedido(numero, novoStatus);
                btnStatus.disabled = false;
                return;
            }

            const btnSalvarPgto = e.target.closest('button[data-acao-salvar-pgto]');
            if (btnSalvarPgto) {
                const numero = btnSalvarPgto.dataset.acaoSalvarPgto;
                const sel = el.conteudo.querySelector(`select[data-select-pgto="${CSS.escape(numero)}"]`);
                const inpTroco = el.conteudo.querySelector(`input[data-input-troco="${CSS.escape(numero)}"]`);
                btnSalvarPgto.disabled = true;
                await salvarEdicaoPedido(numero, {
                    pagamento: sel ? sel.value : 'Pix',
                    troco: inpTroco ? inpTroco.value.trim() : '',
                });
                btnSalvarPgto.disabled = false;
                return;
            }

            const btnPix = e.target.closest('button[data-acao-pix]');
            if (btnPix) {
                const pedido = state.pedidos.find((p) => p.numero === btnPix.dataset.acaoPix);
                if (pedido) abrirModalPix(pedido);
                return;
            }

            const btnEditar = e.target.closest('button[data-acao-editar]');
            if (btnEditar) {
                const pedido = state.pedidos.find((p) => p.numero === btnEditar.dataset.acaoEditar);
                if (pedido) abrirModalEditar(pedido);
                return;
            }

            const btnCancelar = e.target.closest('button[data-acao-cancelar]');
            if (btnCancelar) {
                const numero = btnCancelar.dataset.acaoCancelar;
                if (!window.confirm(`Deseja realmente cancelar o pedido #${numero}? Se o estoque já foi baixado, ele será estornado.`)) {
                    return;
                }
                btnCancelar.disabled = true;
                await alterarStatusPedido(numero, 'Cancelado');
                btnCancelar.disabled = false;
            }
        });
    }

    window.EncantoPedidosPainel = {
        abrirModalEditar,
        abrirModalPix,
        salvarEdicaoPedido,
        alterarStatusPedido,
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (state.modo === 'admin') return;
        mapearElementos();
        el.inputPin.value = sessionStorage.getItem(SESSION_PIN_KEY) || '';
        registrarEventos();
        carregarPedidos(true);
        state.timerAuto = setInterval(() => {
            if (obterPin()) carregarPedidos(true);
        }, 15000);
    });
})();
