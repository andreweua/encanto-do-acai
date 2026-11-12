/**
 * Controlador principal do Montador de Pedidos e exibição de estoque.
 */
(() => {
    const {
        carregarCatalogo,
        getEstoqueDisponivel,
        isProdutoDisponivel,
        formatarMoeda,
    } = window.EncantoEstoque;

    const config = window.ENCANTO_CONFIG;

    const state = {
        produtos: [],
        origem: 'padrao',
        atualizadoEm: null,
        carregando: true,
        copoSelecionadoId: null,
        gratisSelecionados: new Set(),
        pagosSelecionados: new Set(),
        observacaoCopo: '',
        sacola: [],
    };

    const el = {};

    function mapearElementos() {
        el.statusTexto = document.getElementById('estoque-status-texto');
        el.btnAtualizar = document.getElementById('btn-atualizar-estoque');
        el.iconeAtualizar = document.getElementById('icone-atualizar-estoque');
        el.listaCopos = document.getElementById('lista-copos');
        el.listaGratis = document.getElementById('lista-adicionais-gratis');
        el.listaPagos = document.getElementById('lista-adicionais-pagos');
        el.inputObs = document.getElementById('observacao-copo');
        el.totalCopoAtual = document.getElementById('total-copo-atual');
        el.btnAdicionarSacola = document.getElementById('btn-adicionar-sacola');
        el.resumoSacola = document.getElementById('resumo-sacola');
        el.badgeQtdSacola = document.getElementById('badge-qtd-sacola');
        el.totalGeral = document.getElementById('total-geral-pedido');
        el.inputNome = document.getElementById('cliente-nome');
        el.radiosEntrega = document.querySelectorAll('input[name="tipo-entrega"]');
        el.campoEnderecoWrapper = document.getElementById('campo-endereco-wrapper');
        el.inputEndereco = document.getElementById('cliente-endereco');
        el.selectPagamento = document.getElementById('forma-pagamento');
        el.campoTrocoWrapper = document.getElementById('campo-troco-wrapper');
        el.inputTroco = document.getElementById('cliente-troco');
        el.alertaPedido = document.getElementById('alerta-pedido');
        el.btnEnviarWhatsapp = document.getElementById('btn-enviar-whatsapp');
        el.toast = document.getElementById('toast-feedback');
    }

    function escapeHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buscarProdutoPorId(id) {
        return state.produtos.find((p) => p.id === id) || null;
    }

    function calcularReservadoNaSacola() {
        const mapa = {};
        const somar = (id) => {
            if (!id) return;
            mapa[id] = (mapa[id] || 0) + 1;
        };

        state.sacola.forEach((item) => {
            somar(item.copoId);
            item.gratisIds.forEach(somar);
            item.pagosIds.forEach(somar);
        });

        return mapa;
    }

    function limparSelecoesIndisponiveis() {
        const reservado = calcularReservadoNaSacola();

        if (state.copoSelecionadoId) {
            const copo = buscarProdutoPorId(state.copoSelecionadoId);
            if (!isProdutoDisponivel(copo, reservado[state.copoSelecionadoId] || 0)) {
                state.copoSelecionadoId = null;
            }
        }

        for (const id of Array.from(state.gratisSelecionados)) {
            const prod = buscarProdutoPorId(id);
            if (!isProdutoDisponivel(prod, reservado[id] || 0)) {
                state.gratisSelecionados.delete(id);
            }
        }

        for (const id of Array.from(state.pagosSelecionados)) {
            const prod = buscarProdutoPorId(id);
            if (!isProdutoDisponivel(prod, reservado[id] || 0)) {
                state.pagosSelecionados.delete(id);
            }
        }
    }

    function validarSacolaContraEstoque() {
        if (state.sacola.length === 0) return [];

        const usoAcumulado = {};
        const removidos = [];
        const novaSacola = [];

        const tentarReservar = (id) => {
            const prod = buscarProdutoPorId(id);
            const usado = usoAcumulado[id] || 0;
            if (!isProdutoDisponivel(prod, usado)) {
                return false;
            }
            usoAcumulado[id] = usado + 1;
            return true;
        };

        state.sacola.forEach((item) => {
            const copo = buscarProdutoPorId(item.copoId);
            if (!tentarReservar(item.copoId)) {
                removidos.push(copo ? copo.nome : item.copoId);
                return;
            }

            const gratisValidos = item.gratisIds.filter((id) => {
                if (tentarReservar(id)) return true;
                const p = buscarProdutoPorId(id);
                if (p) removidos.push(p.nome);
                return false;
            });

            const pagosValidos = item.pagosIds.filter((id) => {
                if (tentarReservar(id)) return true;
                const p = buscarProdutoPorId(id);
                if (p) removidos.push(p.nome);
                return false;
            });

            novaSacola.push({
                ...item,
                gratisIds: gratisValidos,
                pagosIds: pagosValidos,
            });
        });

        state.sacola = novaSacola;
        return removidos;
    }

    function calcularTotalCopo(copoId, pagosIds) {
        const copo = buscarProdutoPorId(copoId);
        let total = copo ? copo.preco : 0;

        pagosIds.forEach((id) => {
            const prod = buscarProdutoPorId(id);
            if (prod) total += prod.preco;
        });

        return total;
    }

    function criarBadgeEstoque(produto, restante) {
        if (!produto.ativo || produto.estoque <= 0) {
            return '<span class="inline-flex items-center gap-1 bg-slate-200 text-slate-600 font-bold px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wide">Indisponível</span>';
        }
        if (restante <= 0) {
            return '<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">Limite na sacola</span>';
        }
        if (restante <= (config.LOW_STOCK_THRESHOLD || 3)) {
            return `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full text-xs">Últimas ${restante} un.</span>`;
        }
        return '';
    }

    function renderCopos(reservado) {
        const copos = state.produtos.filter((p) => p.categoria === 'copo');
        if (copos.length === 0) {
            el.listaCopos.innerHTML = '<li class="p-6 text-center text-slate-500">Nenhum tamanho cadastrado no momento.</li>';
            return;
        }

        el.listaCopos.innerHTML = copos.map((copo) => {
            const restante = getEstoqueDisponivel(copo, reservado[copo.id] || 0);
            const disponivel = restante > 0;
            const selecionado = state.copoSelecionadoId === copo.id && disponivel;
            const badge = criarBadgeEstoque(copo, restante);

            return `
                <li>
                    <button
                        type="button"
                        data-copo-id="${escapeHtml(copo.id)}"
                        ${disponivel ? '' : 'disabled'}
                        aria-pressed="${selecionado}"
                        class="w-full flex items-center justify-between gap-3 p-4 text-left transition-all ${
                            !disponivel
                                ? 'bg-slate-100/80 opacity-60 cursor-not-allowed'
                                : selecionado
                                    ? 'bg-pink-50 ring-2 ring-inset ring-acai-magenta'
                                    : 'hover:bg-pink-50/60 cursor-pointer'
                        }"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                !disponivel
                                    ? 'border-slate-300 bg-slate-200'
                                    : selecionado
                                        ? 'border-acai-magenta bg-acai-magenta text-white'
                                        : 'border-slate-300 bg-white'
                            }">
                                ${selecionado ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
                            </span>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-bold text-lg sm:text-xl ${
                                    disponivel ? 'text-acai-dark' : 'text-slate-400 line-through'
                                }">${escapeHtml(copo.nome)}</span>
                                ${badge}
                            </div>
                        </div>
                        <span class="shrink-0 font-bold px-4 py-1.5 rounded-full text-base sm:text-lg ${
                            disponivel
                                ? 'bg-acai-magenta text-white'
                                : 'bg-slate-300 text-slate-600'
                        }">
                            ${escapeHtml(formatarMoeda(copo.preco))}
                        </span>
                    </button>
                </li>
            `;
        }).join('');
    }

    function renderAdicionaisGratis(reservado) {
        const itens = state.produtos.filter((p) => p.categoria === 'adicional_gratis');
        if (itens.length === 0) {
            el.listaGratis.innerHTML = '<li class="text-center text-slate-500 py-4">Nenhum adicional grátis disponível.</li>';
            return;
        }

        el.listaGratis.innerHTML = itens.map((item) => {
            const restante = getEstoqueDisponivel(item, reservado[item.id] || 0);
            const disponivel = restante > 0;
            const selecionado = state.gratisSelecionados.has(item.id) && disponivel;
            const badge = criarBadgeEstoque(item, restante);

            return `
                <li>
                    <button
                        type="button"
                        data-gratis-id="${escapeHtml(item.id)}"
                        ${disponivel ? '' : 'disabled'}
                        aria-pressed="${selecionado}"
                        class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            !disponivel
                                ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                                : selecionado
                                    ? 'border-acai-cyan bg-teal-50/80 shadow-sm'
                                    : 'border-slate-100 hover:border-acai-cyan/50 hover:bg-slate-50 cursor-pointer'
                        }"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                !disponivel
                                    ? 'border-slate-300 bg-slate-200'
                                    : selecionado
                                        ? 'border-acai-cyan bg-acai-cyan text-white'
                                        : 'border-slate-300 bg-white'
                            }">
                                ${selecionado ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
                            </span>
                            <span class="font-semibold text-sm sm:text-base ${
                                disponivel ? 'text-slate-700' : 'text-slate-400 line-through'
                            }">${escapeHtml(item.nome)}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${badge || '<span class="text-xs font-bold text-acai-cyan uppercase">Grátis</span>'}
                        </div>
                    </button>
                </li>
            `;
        }).join('');
    }

    function renderAdicionaisPagos(reservado) {
        const itens = state.produtos.filter((p) => p.categoria === 'adicional_pago');
        if (itens.length === 0) {
            el.listaPagos.innerHTML = '<li class="text-center text-slate-500 py-4">Nenhum adicional pago cadastrado.</li>';
            return;
        }

        el.listaPagos.innerHTML = itens.map((item) => {
            const restante = getEstoqueDisponivel(item, reservado[item.id] || 0);
            const disponivel = restante > 0;
            const selecionado = state.pagosSelecionados.has(item.id) && disponivel;
            const badge = criarBadgeEstoque(item, restante);

            return `
                <li>
                    <button
                        type="button"
                        data-pago-id="${escapeHtml(item.id)}"
                        ${disponivel ? '' : 'disabled'}
                        aria-pressed="${selecionado}"
                        class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            !disponivel
                                ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                                : selecionado
                                    ? 'border-acai-yellow bg-amber-50/80 shadow-sm'
                                    : 'border-slate-100 hover:border-acai-yellow hover:bg-slate-50 cursor-pointer'
                        }"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                !disponivel
                                    ? 'border-slate-300 bg-slate-200'
                                    : selecionado
                                        ? 'border-acai-yellow bg-acai-yellow text-acai-dark'
                                        : 'border-slate-300 bg-white'
                            }">
                                ${selecionado ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
                            </span>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-bold text-sm sm:text-base ${
                                    disponivel ? 'text-slate-700' : 'text-slate-400 line-through'
                                }">${escapeHtml(item.nome)}</span>
                                ${badge}
                            </div>
                        </div>
                        <span class="shrink-0 font-bold px-3 py-1 rounded-full text-xs sm:text-sm ${
                            disponivel
                                ? 'bg-acai-dark text-white'
                                : 'bg-slate-300 text-slate-600'
                        }">
                            + ${escapeHtml(formatarMoeda(item.preco))}
                        </span>
                    </button>
                </li>
            `;
        }).join('');
    }

    function obterResumoCopo(item) {
        const copo = buscarProdutoPorId(item.copoId);
        const gratisNomes = item.gratisIds
            .map((id) => buscarProdutoPorId(id)?.nome)
            .filter(Boolean);
        const pagosItens = item.pagosIds
            .map((id) => buscarProdutoPorId(id))
            .filter(Boolean);
        const subtotal = calcularTotalCopo(item.copoId, item.pagosIds);

        return { copo, gratisNomes, pagosItens, subtotal };
    }

    function obterItensParaPedido() {
        const itens = [...state.sacola];
        if (state.copoSelecionadoId) {
            itens.push({
                uid: 'copo-em-montagem',
                emMontagem: true,
                copoId: state.copoSelecionadoId,
                gratisIds: Array.from(state.gratisSelecionados),
                pagosIds: Array.from(state.pagosSelecionados),
                observacao: state.observacaoCopo.trim(),
            });
        }
        return itens;
    }

    function renderResumoPedido() {
        const totalAtual = state.copoSelecionadoId
            ? calcularTotalCopo(state.copoSelecionadoId, Array.from(state.pagosSelecionados))
            : 0;
        el.totalCopoAtual.textContent = formatarMoeda(totalAtual);

        el.btnAdicionarSacola.disabled = !state.copoSelecionadoId;

        const itensPedido = obterItensParaPedido();
        el.badgeQtdSacola.textContent = `${itensPedido.length} ${itensPedido.length === 1 ? 'copo' : 'copos'}`;

        if (itensPedido.length === 0) {
            el.resumoSacola.innerHTML = `
                <div class="text-center py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-sm">
                    <i class="fa-solid fa-ice-cream text-2xl text-acai-magenta/50 mb-2 block"></i>
                    Escolha um tamanho de copo acima para começar a montar o seu pedido.
                </div>
            `;
            el.totalGeral.textContent = formatarMoeda(0);
            return;
        }

        let somaTotal = 0;

        el.resumoSacola.innerHTML = itensPedido.map((item, idx) => {
            const { copo, gratisNomes, pagosItens, subtotal } = obterResumoCopo(item);
            somaTotal += subtotal;

            const titulo = copo ? `Copo ${copo.nome}` : 'Copo';
            const etiqueta = item.emMontagem
                ? '<span class="bg-pink-100 text-acai-magenta text-[11px] font-bold px-2 py-0.5 rounded-full">Em montagem</span>'
                : `<span class="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">Item ${idx + 1}</span>`;

            const botaoRemover = item.emMontagem
                ? `<button type="button" id="btn-limpar-montagem" class="text-xs font-semibold text-slate-500 hover:text-acai-magenta transition-colors">Limpar</button>`
                : `<button type="button" data-remover-uid="${escapeHtml(item.uid)}" class="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"><i class="fa-regular fa-trash-can mr-1"></i>Remover</button>`;

            return `
                <div class="p-4 rounded-2xl border ${item.emMontagem ? 'border-acai-magenta/40 bg-pink-50/40' : 'border-slate-200 bg-white'} space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-acai-dark">${escapeHtml(titulo)}</span>
                            ${etiqueta}
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-acai-magenta">${escapeHtml(formatarMoeda(subtotal))}</span>
                            ${botaoRemover}
                        </div>
                    </div>
                    <p class="text-xs text-slate-600">
                        <span class="font-semibold">Grátis:</span>
                        ${gratisNomes.length > 0 ? escapeHtml(gratisNomes.join(', ')) : 'Nenhum'}
                    </p>
                    <p class="text-xs text-slate-600">
                        <span class="font-semibold">Pagos:</span>
                        ${pagosItens.length > 0 ? escapeHtml(pagosItens.map((p) => `${p.nome} (${formatarMoeda(p.preco)})`).join(', ')) : 'Nenhum'}
                    </p>
                    ${item.observacao ? `<p class="text-xs text-slate-600"><span class="font-semibold">Obs:</span> ${escapeHtml(item.observacao)}</p>` : ''}
                </div>
            `;
        }).join('');

        el.totalGeral.textContent = formatarMoeda(somaTotal);
    }

    function renderStatusEstoque() {
        if (!el.statusTexto) return;
        if (state.carregando) {
            el.statusTexto.textContent = 'Sincronizando estoque...';
            return;
        }
        const hora = state.atualizadoEm
            ? state.atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '';
        el.statusTexto.textContent = state.origem === 'sheets'
            ? `Estoque sincronizado às ${hora}`
            : `Cardápio disponível (${hora})`;
    }

    function renderizarTudo() {
        const reservado = calcularReservadoNaSacola();
        renderStatusEstoque();
        renderCopos(reservado);
        renderAdicionaisGratis(reservado);
        renderAdicionaisPagos(reservado);
        renderResumoPedido();
    }

    function mostrarToast(mensagem) {
        if (!el.toast) return;
        el.toast.textContent = mensagem;
        el.toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        clearTimeout(mostrarToast._timer);
        mostrarToast._timer = setTimeout(() => {
            el.toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
        }, 2800);
    }

    function mostrarAlertaPedido(mensagem) {
        if (!mensagem) {
            el.alertaPedido.classList.add('hidden');
            el.alertaPedido.textContent = '';
            return;
        }
        el.alertaPedido.textContent = mensagem;
        el.alertaPedido.classList.remove('hidden');
    }

    function adicionarCopoAtualNaSacola() {
        if (!state.copoSelecionadoId) return;

        const reservado = calcularReservadoNaSacola();
        const copo = buscarProdutoPorId(state.copoSelecionadoId);
        if (!isProdutoDisponivel(copo, reservado[state.copoSelecionadoId] || 0)) {
            mostrarToast('Este tamanho acabou de atingir o limite de estoque.');
            limparSelecoesIndisponiveis();
            renderizarTudo();
            return;
        }

        state.sacola.push({
            uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            copoId: state.copoSelecionadoId,
            gratisIds: Array.from(state.gratisSelecionados),
            pagosIds: Array.from(state.pagosSelecionados),
            observacao: state.observacaoCopo.trim(),
        });

        state.copoSelecionadoId = null;
        state.gratisSelecionados.clear();
        state.pagosSelecionados.clear();
        state.observacaoCopo = '';
        if (el.inputObs) el.inputObs.value = '';

        mostrarAlertaPedido('');
        renderizarTudo();
        mostrarToast('Copo adicionado ao pedido! Você pode montar outro ou finalizar abaixo.');
    }

    function obterTipoEntrega() {
        const marcado = Array.from(el.radiosEntrega).find((r) => r.checked);
        return marcado ? marcado.value : 'Entrega';
    }

    function atualizarCamposCondicionais() {
        const tipo = obterTipoEntrega();
        if (tipo === 'Entrega') {
            el.campoEnderecoWrapper.classList.remove('hidden');
        } else {
            el.campoEnderecoWrapper.classList.add('hidden');
        }

        if (el.selectPagamento.value === 'Dinheiro') {
            el.campoTrocoWrapper.classList.remove('hidden');
        } else {
            el.campoTrocoWrapper.classList.add('hidden');
        }
    }

    function gerarMensagemWhatsApp(itensPedido) {
        const nome = el.inputNome.value.trim();
        const tipoEntrega = obterTipoEntrega();
        const endereco = el.inputEndereco.value.trim();
        const pagamento = el.selectPagamento.value;
        const troco = el.inputTroco.value.trim();

        const linhas = [
            '🍇 *NOVO PEDIDO - ENCANTO DO AÇAÍ* 🍇',
            '',
            '*Itens do pedido:*',
        ];

        let totalGeral = 0;

        itensPedido.forEach((item, index) => {
            const { copo, gratisNomes, pagosItens, subtotal } = obterResumoCopo(item);
            totalGeral += subtotal;

            linhas.push(`${index + 1}. *Copo ${copo ? copo.nome : ''}* — ${formatarMoeda(copo ? copo.preco : 0)}`);
            linhas.push(`   • Grátis: ${gratisNomes.length > 0 ? gratisNomes.join(', ') : 'Nenhum'}`);
            if (pagosItens.length > 0) {
                linhas.push(`   • Pagos: ${pagosItens.map((p) => `${p.nome} (+ ${formatarMoeda(p.preco)})`).join(', ')}`);
            }
            if (item.observacao) {
                linhas.push(`   • Obs: ${item.observacao}`);
            }
            linhas.push(`   Subtotal: ${formatarMoeda(subtotal)}`);
            linhas.push('');
        });

        linhas.push(`*Total do Pedido: ${formatarMoeda(totalGeral)}*`);
        linhas.push('');
        if (nome) linhas.push(`*Cliente:* ${nome}`);
        linhas.push(`*Recebimento:* ${tipoEntrega}`);
        if (tipoEntrega === 'Entrega' && endereco) {
            linhas.push(`*Endereço:* ${endereco}`);
        }
        linhas.push(`*Pagamento:* ${pagamento}${pagamento === 'Dinheiro' && troco ? ` (Troco para ${troco})` : ''}`);

        return linhas.join('\n');
    }

    function finalizarNoWhatsapp() {
        mostrarAlertaPedido('');

        const itensPedido = obterItensParaPedido();
        if (itensPedido.length === 0) {
            mostrarAlertaPedido('Selecione pelo menos um tamanho de copo no cardápio para montar o seu pedido.');
            document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const nome = el.inputNome.value.trim();
        if (!nome) {
            mostrarAlertaPedido('Informe o seu nome para identificarmos o pedido.');
            el.inputNome.focus();
            return;
        }

        const tipoEntrega = obterTipoEntrega();
        if (tipoEntrega === 'Entrega' && !el.inputEndereco.value.trim()) {
            mostrarAlertaPedido('Informe o endereço completo para entrega (ou selecione Retirada).');
            el.inputEndereco.focus();
            return;
        }

        const mensagem = gerarMensagemWhatsApp(itensPedido);
        const url = `https://wa.me/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    async function carregarERenderizar(mostrarFeedback = false) {
        state.carregando = true;
        if (el.iconeAtualizar) el.iconeAtualizar.classList.add('fa-spin');
        renderStatusEstoque();

        const resultado = await carregarCatalogo(config);
        state.produtos = resultado.produtos;
        state.origem = resultado.origem;
        state.atualizadoEm = resultado.atualizadoEm;
        state.carregando = false;

        if (el.iconeAtualizar) el.iconeAtualizar.classList.remove('fa-spin');

        const removidos = validarSacolaContraEstoque();
        limparSelecoesIndisponiveis();
        renderizarTudo();

        if (removidos.length > 0) {
            mostrarToast(`Itens sem estoque removidos: ${removidos.join(', ')}`);
        } else if (mostrarFeedback) {
            mostrarToast('Estoque atualizado!');
        }
    }

    function registrarEventos() {
        el.listaCopos.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-copo-id]');
            if (!btn || btn.disabled) return;
            state.copoSelecionadoId = btn.dataset.copoId;
            mostrarAlertaPedido('');
            renderizarTudo();
        });

        el.listaGratis.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-gratis-id]');
            if (!btn || btn.disabled) return;
            const id = btn.dataset.gratisId;
            if (state.gratisSelecionados.has(id)) {
                state.gratisSelecionados.delete(id);
            } else {
                state.gratisSelecionados.add(id);
            }
            renderizarTudo();
        });

        el.listaPagos.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-pago-id]');
            if (!btn || btn.disabled) return;
            const id = btn.dataset.pagoId;
            if (state.pagosSelecionados.has(id)) {
                state.pagosSelecionados.delete(id);
            } else {
                state.pagosSelecionados.add(id);
            }
            renderizarTudo();
        });

        el.inputObs.addEventListener('input', (event) => {
            state.observacaoCopo = event.target.value;
            renderResumoPedido();
        });

        el.btnAdicionarSacola.addEventListener('click', adicionarCopoAtualNaSacola);

        el.resumoSacola.addEventListener('click', (event) => {
            const btnRemover = event.target.closest('button[data-remover-uid]');
            if (btnRemover) {
                const uid = btnRemover.dataset.removerUid;
                state.sacola = state.sacola.filter((item) => item.uid !== uid);
                renderizarTudo();
                return;
            }

            if (event.target.closest('#btn-limpar-montagem')) {
                state.copoSelecionadoId = null;
                state.gratisSelecionados.clear();
                state.pagosSelecionados.clear();
                state.observacaoCopo = '';
                el.inputObs.value = '';
                renderizarTudo();
            }
        });

        el.radiosEntrega.forEach((radio) => {
            radio.addEventListener('change', atualizarCamposCondicionais);
        });

        el.selectPagamento.addEventListener('change', atualizarCamposCondicionais);
        el.btnEnviarWhatsapp.addEventListener('click', finalizarNoWhatsapp);

        if (el.btnAtualizar) {
            el.btnAtualizar.addEventListener('click', () => carregarERenderizar(true));
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        mapearElementos();
        atualizarCamposCondicionais();
        registrarEventos();
        carregarERenderizar(false);
    });
})();
