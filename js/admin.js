/**
 * Painel administrativo de estoque — lê e envia produtos para o Google Sheets via Apps Script.
 */
(() => {
    const {
        carregarCatalogo,
        gerarCsvCatalogo,
        extrairVolumeMl,
        obterBaseAcai,
        getAcaiRestanteMl,
        getEstoqueCopoDisponivel,
        isProdutoDisponivel,
    } = window.EncantoEstoque;

    const config = window.ENCANTO_CONFIG;
    const STORAGE_URL_KEY = 'encanto_apps_script_url';
    const SESSION_PIN_KEY = 'encanto_admin_pin';

    const state = {
        produtos: [],
        pedidos: [],
        filtroStatus: 'todos',
        busca: '',
        salvando: false,
        carregando: false,
    };

    const el = {};

    function mapearElementos() {
        el.inputScriptUrl = document.getElementById('admin-script-url');
        el.inputPin = document.getElementById('admin-pin');
        el.btnCarregar = document.getElementById('btn-carregar-planilha');
        el.btnSalvar = document.getElementById('btn-salvar-planilha');
        el.btnBaixarCsv = document.getElementById('btn-baixar-csv');
        el.statusConexao = document.getElementById('admin-status-conexao');

        el.kpiTotal = document.getElementById('kpi-total');
        el.kpiDisponiveis = document.getElementById('kpi-disponiveis');
        el.kpiIndisponiveis = document.getElementById('kpi-indisponiveis');
        el.kpiBaixo = document.getElementById('kpi-baixo');

        el.acaiBadgeStatus = document.getElementById('acai-badge-status');
        el.inputAcaiLitros = document.getElementById('input-acai-litros');
        el.btnAcaiMenos1 = document.getElementById('btn-acai-menos-1');
        el.btnAcaiMenosMeio = document.getElementById('btn-acai-menos-meio');
        el.btnAcaiMaisMeio = document.getElementById('btn-acai-mais-meio');
        el.btnAcaiMais1 = document.getElementById('btn-acai-mais-1');
        el.btnAcaiAtivo = document.getElementById('btn-acai-ativo');
        el.acaiEquivalencia = document.getElementById('acai-equivalencia-copos');

        el.inputBusca = document.getElementById('admin-busca');
        el.filtrosBtn = document.querySelectorAll('button[data-filtro-status]');
        el.containerListas = document.getElementById('admin-listas-categorias');

        el.formNovo = document.getElementById('form-novo-item');
        el.novoCategoria = document.getElementById('novo-categoria');
        el.novoNome = document.getElementById('novo-nome');
        el.novoPreco = document.getElementById('novo-preco');
        el.novoEstoque = document.getElementById('novo-estoque');

        el.formEmpresa = document.getElementById('form-dados-empresa');
        el.empresaNome = document.getElementById('empresa-nome');
        el.empresaWhatsapp = document.getElementById('empresa-whatsapp');
        el.empresaHorario = document.getElementById('empresa-horario');
        el.empresaEndereco = document.getElementById('empresa-endereco');
        el.empresaMaps = document.getElementById('empresa-maps');
        el.empresaPixChave = document.getElementById('empresa-pix-chave');
        el.empresaPixTitular = document.getElementById('empresa-pix-titular');
        el.empresaPixCidade = document.getElementById('empresa-pix-cidade');
        el.btnSalvarEmpresa = document.getElementById('btn-salvar-empresa');

        el.btnAdminCarregarPedidos = document.getElementById('btn-admin-carregar-pedidos');
        el.adminListaPedidos = document.getElementById('admin-lista-pedidos');

        el.toast = document.getElementById('admin-toast');
    }

    function escapeHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function obterScriptUrlEfetiva() {
        const digitada = (el.inputScriptUrl?.value || '').trim();
        if (digitada) return digitada;
        return String(config.APPS_SCRIPT_URL || '').trim();
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
        }, 3400);
    }

    function atualizarStatus(texto, tipo = 'neutro') {
        if (!el.statusConexao) return;
        el.statusConexao.textContent = texto;
        el.statusConexao.className = 'text-xs font-semibold px-3 py-1.5 rounded-full ';
        if (tipo === 'ok') {
            el.statusConexao.className += 'bg-emerald-100 text-emerald-800';
        } else if (tipo === 'alerta') {
            el.statusConexao.className += 'bg-amber-100 text-amber-800';
        } else if (tipo === 'erro') {
            el.statusConexao.className += 'bg-red-100 text-red-800';
        } else {
            el.statusConexao.className += 'bg-slate-100 text-slate-600';
        }
    }

    function garantirBaseAcai() {
        let base = obterBaseAcai(state.produtos);
        if (!base) {
            base = {
                id: 'acai-litros',
                categoria: 'acai',
                nome: 'Açaí (Litros)',
                preco: 0,
                estoque: 10,
                ativo: true,
            };
            state.produtos.unshift(base);
        }
        return base;
    }

    function itemDisponivelEfetivo(produto) {
        if (produto.categoria === 'copo') {
            return getEstoqueCopoDisponivel(produto, state.produtos, 0, 0) > 0;
        }
        return isProdutoDisponivel(produto);
    }

    function renderizarCardAcai() {
        const base = garantirBaseAcai();
        const litros = Math.max(0, Number(base.estoque) || 0);
        const mlTotal = getAcaiRestanteMl(base, 0);
        const disponivel = base.ativo && mlTotal > 0;

        el.inputAcaiLitros.value = String(litros);
        el.acaiBadgeStatus.textContent = disponivel ? 'Disponível' : 'Esgotado';
        el.acaiBadgeStatus.className = `text-xs font-bold px-3 py-0.5 rounded-full ${
            disponivel ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`;

        el.btnAcaiAtivo.textContent = base.ativo ? 'Ativo' : 'Pausado';
        el.btnAcaiAtivo.className = `px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
            base.ativo ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-400 hover:bg-slate-500 text-slate-900'
        }`;

        const copos = state.produtos.filter((p) => p.categoria === 'copo');
        if (!base.ativo || mlTotal <= 0) {
            el.acaiEquivalencia.textContent = '0 copos disponíveis — todos os tamanhos aparecem como Indisponível no cardápio.';
            return;
        }

        const partes = copos.map((copo) => {
            const vol = extrairVolumeMl(copo);
            const qtdPorLitros = vol > 0 ? Math.floor(mlTotal / vol) : 0;
            const qtdEfetiva = getEstoqueCopoDisponivel(copo, state.produtos, 0, 0);
            if (!copo.ativo) {
                return `${copo.nome}: pausado`;
            }
            if (qtdPorLitros <= 0) {
                return `${copo.nome}: indisponível (< ${vol} ml)`;
            }
            return `${copo.nome}: até ${qtdEfetiva} un.`;
        });

        el.acaiEquivalencia.textContent = `${litros} L (${mlTotal.toLocaleString('pt-BR')} ml) → ${partes.join(' • ')}`;
    }

    function atualizarKpis() {
        const itensMenu = state.produtos.filter((p) => p.categoria !== 'acai');
        const total = itensMenu.length;
        const disponiveis = itensMenu.filter((p) => itemDisponivelEfetivo(p)).length;
        const indisponiveis = total - disponiveis;
        const baixo = itensMenu.filter((p) => {
            if (!itemDisponivelEfetivo(p)) return false;
            if (p.categoria === 'copo') {
                return getEstoqueCopoDisponivel(p, state.produtos, 0, 0) <= (config.LOW_STOCK_THRESHOLD || 3);
            }
            return p.estoque <= (config.LOW_STOCK_THRESHOLD || 3);
        }).length;

        el.kpiTotal.textContent = String(total);
        el.kpiDisponiveis.textContent = String(disponiveis);
        el.kpiIndisponiveis.textContent = String(indisponiveis);
        el.kpiBaixo.textContent = String(baixo);
    }

    function produtoPassaNosFiltros(produto) {
        const disponivel = itemDisponivelEfetivo(produto);
        if (state.filtroStatus === 'disponiveis' && !disponivel) return false;
        if (state.filtroStatus === 'indisponiveis' && disponivel) return false;
        if (state.filtroStatus === 'baixo') {
            if (!disponivel) return false;
            const qtd = produto.categoria === 'copo'
                ? getEstoqueCopoDisponivel(produto, state.produtos, 0, 0)
                : produto.estoque;
            if (qtd > (config.LOW_STOCK_THRESHOLD || 3)) return false;
        }

        if (state.busca) {
            const termo = state.busca.toLowerCase();
            if (!produto.nome.toLowerCase().includes(termo) && !produto.id.toLowerCase().includes(termo)) {
                return false;
            }
        }
        return true;
    }

    function renderizarProdutos() {
        renderizarCardAcai();
        atualizarKpis();

        const grupos = [
            { chave: 'copo', titulo: 'Copos de Açaí (Rendimento pelos Litros)', corBorda: 'border-acai-magenta', corBadge: 'bg-acai-magenta text-white' },
            { chave: 'adicional_gratis', titulo: 'Adicionais Grátis', corBorda: 'border-acai-cyan', corBadge: 'bg-acai-cyan text-white' },
            { chave: 'adicional_pago', titulo: 'Adicionais Pagos', corBorda: 'border-acai-yellow', corBadge: 'bg-acai-yellow text-acai-dark' },
        ];

        const htmlGrupos = grupos.map((grupo) => {
            const itensGrupo = state.produtos
                .filter((p) => p.categoria === grupo.chave)
                .filter(produtoPassaNosFiltros);

            const corpo = itensGrupo.length === 0
                ? '<p class="text-sm text-slate-400 py-4 text-center">Nenhum item neste filtro.</p>'
                : itensGrupo.map((item) => {
                    const isCopo = item.categoria === 'copo';
                    const qtdEfetiva = isCopo
                        ? getEstoqueCopoDisponivel(item, state.produtos, 0, 0)
                        : item.estoque;
                    const disponivel = itemDisponivelEfetivo(item);
                    const estoqueBaixo = disponivel && qtdEfetiva <= (config.LOW_STOCK_THRESHOLD || 3);

                    const badgeStatus = !disponivel
                        ? `<span class="bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">${isCopo ? 'Indisponível (açaí ou copo)' : 'Indisponível'}</span>`
                        : estoqueBaixo
                            ? `<span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">${isCopo ? `Restam ${qtdEfetiva} copos` : 'Estoque baixo'}</span>`
                            : `<span class="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">${isCopo ? `Até ${qtdEfetiva} copos` : 'Disponível'}</span>`;

                    return `
                        <div data-item-id="${escapeHtml(item.id)}" class="p-4 rounded-2xl border ${disponivel ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/40'} flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-acai-dark text-base ${disponivel ? '' : 'line-through text-slate-500'}">${escapeHtml(item.nome)}</span>
                                    ${badgeStatus}
                                </div>
                                <span class="text-[11px] font-mono text-slate-400">${escapeHtml(item.id)}${isCopo ? ' • Calculado pelos litros de açaí' : ''}</span>
                            </div>

                            <div class="flex flex-wrap items-center gap-3 sm:gap-4">
                                <!-- Preço -->
                                <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                    <span>R$</span>
                                    <input
                                        type="number"
                                        step="0.50"
                                        min="0"
                                        data-acao="preco"
                                        value="${Number(item.preco || 0).toFixed(2)}"
                                        class="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-acai-magenta"
                                    >
                                </label>

                                ${isCopo ? `
                                <!-- Quantidade calculada (somente leitura) -->
                                <div class="flex items-center gap-1.5 rounded-xl border border-acai-magenta/30 bg-pink-50 px-3 py-1.5" title="Calculado automaticamente a partir dos litros de açaí">
                                    <i class="fa-solid fa-calculator text-acai-magenta text-xs"></i>
                                    <span class="text-sm font-bold text-acai-dark">${qtdEfetiva}</span>
                                    <span class="text-[11px] font-semibold text-slate-500">copos</span>
                                </div>
                                ` : `
                                <!-- Quantidade -->
                                <div class="flex items-center rounded-xl border border-slate-300 bg-slate-50 overflow-hidden">
                                    <button type="button" data-acao="menos" aria-label="Diminuir estoque" class="px-3 py-1.5 text-slate-700 hover:bg-slate-200 font-bold cursor-pointer">−</button>
                                    <input
                                        type="number"
                                        min="0"
                                        data-acao="estoque"
                                        value="${item.estoque}"
                                        class="w-14 text-center bg-white py-1.5 text-sm font-bold text-acai-dark border-x border-slate-300 focus:outline-none"
                                    >
                                    <button type="button" data-acao="mais" aria-label="Aumentar estoque" class="px-3 py-1.5 text-slate-700 hover:bg-slate-200 font-bold cursor-pointer">+</button>
                                </div>
                                `}

                                <!-- Toggle Disponível -->
                                <button
                                    type="button"
                                    data-acao="toggle-ativo"
                                    class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                                        item.ativo
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                                    }"
                                >
                                    ${item.ativo ? 'Ativo' : 'Pausado'}
                                </button>

                                <!-- Remover -->
                                <button
                                    type="button"
                                    data-acao="remover"
                                    title="Remover item"
                                    class="text-slate-400 hover:text-red-600 p-1.5 transition-colors cursor-pointer"
                                >
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

            return `
                <section class="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 ${grupo.corBorda}">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <h2 class="font-display text-xl sm:text-2xl text-acai-dark tracking-wide">${grupo.titulo}</h2>
                        <span class="text-xs font-bold px-3 py-1 rounded-full ${grupo.corBadge}">${itensGrupo.length} itens</span>
                    </div>
                    <div class="space-y-3">${corpo}</div>
                </section>
            `;
        }).join('');

        el.containerListas.innerHTML = htmlGrupos;
    }

    async function carregarDaPlanilha(mostrarAviso = false) {
        if (state.carregando) return;
        state.carregando = true;
        el.btnCarregar.disabled = true;

        const scriptUrl = obterScriptUrlEfetiva();
        if (scriptUrl) {
            localStorage.setItem(STORAGE_URL_KEY, scriptUrl);
        }

        const cfgAtual = {
            ...config,
            APPS_SCRIPT_URL: scriptUrl,
        };

        const resultado = await carregarCatalogo(cfgAtual);
        state.produtos = resultado.produtos;
        state.carregando = false;
        el.btnCarregar.disabled = false;

        if (resultado.origem === 'sheets') {
            atualizarStatus('Conectado à planilha Google Sheets', 'ok');
            if (mostrarAviso) mostrarToast('Estoque carregado da planilha!', 'sucesso');
        } else if (resultado.vaziaNaPlanilha) {
            atualizarStatus('Planilha vazia — catálogo padrão carregado para envio inicial', 'alerta');
            if (mostrarAviso) mostrarToast('Planilha vazia! Clique em "Enviar para Planilha" para preencher.', 'info');
        } else if (resultado.erro) {
            atualizarStatus(`Falha ao ler planilha (${resultado.erro})`, 'erro');
            if (mostrarAviso) mostrarToast(`Erro: ${resultado.erro}`, 'erro');
        } else {
            atualizarStatus('Usando catálogo padrão (cole a URL do Apps Script para conectar)', 'alerta');
        }

        renderizarProdutos();
    }

    async function enviarParaPlanilha() {
        if (state.salvando) return;

        const scriptUrl = obterScriptUrlEfetiva();
        if (!scriptUrl) {
            mostrarToast('Cole primeiro a URL do Web App do Google Apps Script.', 'erro');
            el.inputScriptUrl.focus();
            return;
        }

        const pin = (el.inputPin.value || '').trim();
        if (!pin) {
            mostrarToast('Digite o PIN de administrador configurado no Apps Script.', 'erro');
            el.inputPin.focus();
            return;
        }

        localStorage.setItem(STORAGE_URL_KEY, scriptUrl);
        sessionStorage.setItem(SESSION_PIN_KEY, pin);

        state.salvando = true;
        el.btnSalvar.disabled = true;
        const textoOriginal = el.btnSalvar.innerHTML;
        el.btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando para a planilha...';

        try {
            // text/plain evita preflight OPTIONS no Google Apps Script
            const resposta = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    pin,
                    produtos: state.produtos,
                }),
            });

            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status} ao enviar para o Apps Script`);
            }

            const json = await resposta.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Não foi possível atualizar a planilha.');
            }

            atualizarStatus(`Salvo na planilha (${json.total} itens)`, 'ok');
            mostrarToast('Planilha atualizada com sucesso!', 'sucesso');
        } catch (erro) {
            atualizarStatus('Erro ao enviar para a planilha', 'erro');
            mostrarToast(erro.message || 'Erro ao enviar para a planilha.', 'erro');
        } finally {
            state.salvando = false;
            el.btnSalvar.disabled = false;
            el.btnSalvar.innerHTML = textoOriginal;
        }
    }

    function baixarCsv() {
        const csv = gerarCsvCatalogo(state.produtos);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'estoque_encanto_do_acai.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        mostrarToast('CSV baixado com o estoque atual!', 'sucesso');
    }

    function ajustarLitrosAcai(delta) {
        const base = garantirBaseAcai();
        const novo = Math.max(0, Math.round(((Number(base.estoque) || 0) + delta) * 1000) / 1000);
        base.estoque = novo;
        if (delta > 0 && novo > 0) base.ativo = true;
        renderizarProdutos();
    }

    function registrarEventos() {
        el.btnCarregar.addEventListener('click', () => carregarDaPlanilha(true));
        el.btnSalvar.addEventListener('click', enviarParaPlanilha);
        el.btnBaixarCsv.addEventListener('click', baixarCsv);

        el.btnAcaiMenos1.addEventListener('click', () => ajustarLitrosAcai(-1));
        el.btnAcaiMenosMeio.addEventListener('click', () => ajustarLitrosAcai(-0.5));
        el.btnAcaiMaisMeio.addEventListener('click', () => ajustarLitrosAcai(0.5));
        el.btnAcaiMais1.addEventListener('click', () => ajustarLitrosAcai(1));

        el.inputAcaiLitros.addEventListener('change', (e) => {
            const base = garantirBaseAcai();
            const val = Number.parseFloat(String(e.target.value || '0').replace(',', '.'));
            base.estoque = Number.isFinite(val) && val >= 0 ? Math.round(val * 1000) / 1000 : 0;
            renderizarProdutos();
        });

        el.btnAcaiAtivo.addEventListener('click', () => {
            const base = garantirBaseAcai();
            base.ativo = !base.ativo;
            renderizarProdutos();
        });

        el.inputBusca.addEventListener('input', (e) => {
            state.busca = e.target.value.trim();
            renderizarProdutos();
        });

        el.filtrosBtn.forEach((btn) => {
            btn.addEventListener('click', () => {
                state.filtroStatus = btn.dataset.filtroStatus;
                el.filtrosBtn.forEach((b) => {
                    const ativo = b === btn;
                    b.className = ativo
                        ? 'px-4 py-2 rounded-full text-xs font-bold bg-acai-dark text-white cursor-pointer'
                        : 'px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer';
                });
                renderizarProdutos();
            });
        });

        el.containerListas.addEventListener('click', (e) => {
            const card = e.target.closest('[data-item-id]');
            if (!card) return;
            const id = card.dataset.itemId;
            const produto = state.produtos.find((p) => p.id === id);
            if (!produto) return;

            const acaoEl = e.target.closest('[data-acao]');
            if (!acaoEl) return;
            const acao = acaoEl.dataset.acao;

            if (acao === 'menos') {
                produto.estoque = Math.max(0, produto.estoque - 1);
                renderizarProdutos();
            } else if (acao === 'mais') {
                produto.estoque += 1;
                if (!produto.ativo && produto.estoque > 0) {
                    produto.ativo = true;
                }
                renderizarProdutos();
            } else if (acao === 'toggle-ativo') {
                produto.ativo = !produto.ativo;
                renderizarProdutos();
            } else if (acao === 'remover') {
                state.produtos = state.produtos.filter((p) => p.id !== id);
                renderizarProdutos();
                mostrarToast(`"${produto.nome}" removido da lista (clique em Enviar para salvar).`);
            }
        });

        el.containerListas.addEventListener('change', (e) => {
            const card = e.target.closest('[data-item-id]');
            if (!card) return;
            const produto = state.produtos.find((p) => p.id === card.dataset.itemId);
            if (!produto) return;

            const acao = e.target.dataset.acao;
            if (acao === 'estoque') {
                const val = Number.parseInt(e.target.value, 10);
                produto.estoque = Number.isFinite(val) && val >= 0 ? val : 0;
                renderizarProdutos();
            } else if (acao === 'preco') {
                const val = Number.parseFloat(e.target.value);
                produto.preco = Number.isFinite(val) && val >= 0 ? val : 0;
                e.target.value = produto.preco.toFixed(2);
            }
        });

        el.formNovo.addEventListener('submit', (e) => {
            e.preventDefault();
            const categoria = el.novoCategoria.value;
            const nome = el.novoNome.value.trim();
            const preco = Math.max(0, Number.parseFloat(el.novoPreco.value) || 0);
            const estoque = Math.max(0, Number.parseInt(el.novoEstoque.value, 10) || 0);

            if (!nome) {
                mostrarToast('Informe o nome do produto.', 'erro');
                return;
            }

            const slug = nome
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const prefixo = categoria === 'copo' ? 'copo' : categoria === 'adicional_gratis' ? 'gratis' : 'pago';
            let id = `${prefixo}-${slug || 'item'}`;
            if (state.produtos.some((p) => p.id === id)) {
                id = `${id}-${Date.now().toString().slice(-4)}`;
            }

            state.produtos.push({
                id,
                categoria,
                nome,
                preco: categoria === 'adicional_gratis' ? 0 : preco,
                estoque,
                ativo: true,
            });

            el.novoNome.value = '';
            el.novoPreco.value = categoria === 'adicional_gratis' ? '0.00' : '';
            el.novoEstoque.value = '15';
            renderizarProdutos();
            mostrarToast(`"${nome}" adicionado! Clique em "Enviar para Planilha" para publicar.`, 'sucesso');
        });

        if (el.formEmpresa) {
            el.formEmpresa.addEventListener('submit', (e) => {
                e.preventDefault();
                salvarEmpresaNaPlanilha();
            });
        }

        if (el.btnAdminCarregarPedidos) {
            el.btnAdminCarregarPedidos.addEventListener('click', () => carregarPedidosAdmin(false));
        }

        if (el.adminListaPedidos) {
            el.adminListaPedidos.addEventListener('click', async (e) => {
                const btnEditar = e.target.closest('button[data-admin-editar-pedido]');
                if (btnEditar) {
                    const pedido = state.pedidos.find((p) => p.numero === btnEditar.dataset.adminEditarPedido);
                    if (pedido && window.EncantoPedidosPainel?.abrirModalEditar) {
                        window.EncantoPedidosPainel.abrirModalEditar(pedido, state.produtos, () => carregarPedidosAdmin(true));
                    }
                    return;
                }
                const btnCancelar = e.target.closest('button[data-admin-cancelar-pedido]');
                if (btnCancelar) {
                    const numero = btnCancelar.dataset.adminCancelarPedido;
                    if (!window.confirm(`Deseja cancelar o pedido #${numero}?`)) return;
                    if (window.EncantoPedidosPainel?.alterarStatusPedido) {
                        btnCancelar.disabled = true;
                        await window.EncantoPedidosPainel.alterarStatusPedido(numero, 'Cancelado');
                        await carregarPedidosAdmin(true);
                        btnCancelar.disabled = false;
                    }
                }
            });
        }
    }

    async function carregarEmpresaDaPlanilha() {
        const scriptUrl = (el.inputScriptUrl.value || config.APPS_SCRIPT_URL || '').trim();
        if (!scriptUrl) return;
        try {
            const sep = scriptUrl.includes('?') ? '&' : '?';
            const resp = await fetch(`${scriptUrl}${sep}action=empresa&_t=${Date.now()}`, { cache: 'no-store' });
            const json = await resp.json();
            if (json && json.ok && json.empresa) {
                const emp = json.empresa;
                if (el.empresaNome) el.empresaNome.value = emp.nomeLoja || '';
                if (el.empresaWhatsapp) el.empresaWhatsapp.value = emp.whatsapp || '';
                if (el.empresaHorario) el.empresaHorario.value = emp.horario || '';
                if (el.empresaEndereco) el.empresaEndereco.value = emp.endereco || '';
                if (el.empresaMaps) el.empresaMaps.value = emp.mapsUrl || '';
                if (el.empresaPixChave) el.empresaPixChave.value = emp.pixChave || '';
                if (el.empresaPixTitular) el.empresaPixTitular.value = emp.pixTitular || '';
                if (el.empresaPixCidade) el.empresaPixCidade.value = emp.pixCidade || '';
            }
        } catch {
            // Ignora falha silenciosa
        }
    }

    async function salvarEmpresaNaPlanilha() {
        const scriptUrl = el.inputScriptUrl.value.trim();
        const pin = el.inputPin.value.trim();
        if (!scriptUrl || !pin) {
            mostrarToast('Preencha a URL do Apps Script e o PIN para salvar os dados da empresa.', 'erro');
            return;
        }
        sessionStorage.setItem(SESSION_PIN_KEY, pin);
        if (el.btnSalvarEmpresa) el.btnSalvarEmpresa.disabled = true;

        try {
            const resp = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'salvar_empresa',
                    pin,
                    empresa: {
                        nomeLoja: el.empresaNome?.value.trim() || '',
                        whatsapp: el.empresaWhatsapp?.value.trim() || '',
                        horario: el.empresaHorario?.value.trim() || '',
                        endereco: el.empresaEndereco?.value.trim() || '',
                        mapsUrl: el.empresaMaps?.value.trim() || '',
                        pixChave: el.empresaPixChave?.value.trim() || '',
                        pixTitular: el.empresaPixTitular?.value.trim() || '',
                        pixCidade: el.empresaPixCidade?.value.trim() || '',
                    },
                }),
            });
            const json = await resp.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Erro ao salvar dados da empresa.');
            }
            mostrarToast('Dados da empresa & PIX salvos na planilha!', 'sucesso');
        } catch (erro) {
            mostrarToast(erro.message || 'Falha ao salvar dados da empresa.', 'erro');
        } finally {
            if (el.btnSalvarEmpresa) el.btnSalvarEmpresa.disabled = false;
        }
    }

    function renderPedidosAdmin() {
        if (!el.adminListaPedidos) return;
        const recentes = [...state.pedidos].reverse().slice(0, 20);
        if (recentes.length === 0) {
            el.adminListaPedidos.innerHTML = '<p class="text-xs text-slate-400">Nenhum pedido registrado.</p>';
            return;
        }

        el.adminListaPedidos.innerHTML = recentes.map((p) => {
            const ativo = p.status !== 'Concluído' && p.status !== 'Cancelado';
            const resumoItens = (p.itens || []).map((it) => `Copo ${it.copoNome || ''}`).join(', ');
            return `
                <div class="rounded-2xl border border-slate-200 p-3.5 bg-slate-50 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <strong class="text-sm text-acai-dark">#${escapeHtml(p.numero)} • ${escapeHtml(p.clienteNome || 'Cliente')}</strong>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">${escapeHtml(p.status)}</span>
                    </div>
                    <p class="text-xs text-slate-600">${escapeHtml(resumoItens || 'Sem itens')} • <strong>${Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> (${escapeHtml(p.pagamento)})</p>
                    ${ativo ? `
                        <div class="flex gap-2 pt-1">
                            <button type="button" data-admin-editar-pedido="${escapeHtml(p.numero)}" class="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-acai-dark font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">
                                <i class="fa-solid fa-pen-to-square mr-1"></i> Editar
                            </button>
                            <button type="button" data-admin-cancelar-pedido="${escapeHtml(p.numero)}" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">
                                Cancelar
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    async function carregarPedidosAdmin(silencioso = false) {
        const scriptUrl = (el.inputScriptUrl.value || config.APPS_SCRIPT_URL || '').trim();
        const pin = el.inputPin.value.trim();
        if (!scriptUrl || !pin) {
            if (!silencioso) mostrarToast('Informe o PIN acima para carregar os pedidos.', 'erro');
            return;
        }
        sessionStorage.setItem(SESSION_PIN_KEY, pin);
        try {
            const sep = scriptUrl.includes('?') ? '&' : '?';
            const resp = await fetch(`${scriptUrl}${sep}action=pedidos&pin=${encodeURIComponent(pin)}&_t=${Date.now()}`, { cache: 'no-store' });
            const json = await resp.json();
            if (!json || !json.ok) {
                throw new Error((json && json.error) || 'Erro ao carregar pedidos.');
            }
            state.pedidos = Array.isArray(json.pedidos) ? json.pedidos : [];
            renderPedidosAdmin();
            if (!silencioso) mostrarToast('Pedidos carregados!', 'sucesso');
        } catch (erro) {
            if (!silencioso) mostrarToast(erro.message || 'Erro ao carregar pedidos.', 'erro');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        mapearElementos();

        const savedUrl = localStorage.getItem(STORAGE_URL_KEY) || config.APPS_SCRIPT_URL || '';
        const savedPin = sessionStorage.getItem(SESSION_PIN_KEY) || '';
        el.inputScriptUrl.value = savedUrl;
        el.inputPin.value = savedPin;

        registrarEventos();
        carregarDaPlanilha(false);
        carregarEmpresaDaPlanilha();
        if (savedPin) carregarPedidosAdmin(true);
    });
})();
