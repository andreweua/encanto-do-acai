/**
 * Módulo de carregamento e controle de estoque via Google Sheets (CSV público).
 */
window.EncantoEstoque = (() => {
    function extrairSheetId(valor) {
        const texto = String(valor || '').trim();
        if (!texto) return '';

        const matchUrl = texto.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matchUrl && matchUrl[1]) {
            return matchUrl[1];
        }
        return texto;
    }

    function montarUrlCsv(config) {
        const urlDireta = String(config.GOOGLE_SHEET_CSV_URL || '').trim();
        if (urlDireta) {
            const separador = urlDireta.includes('?') ? '&' : '?';
            return `${urlDireta}${separador}_t=${Date.now()}`;
        }

        const sheetId = extrairSheetId(config.GOOGLE_SHEET_ID);
        if (!sheetId) return '';

        const params = new URLSearchParams({
            tqx: 'out:csv',
            _t: String(Date.now()),
        });

        const sheetName = String(config.GOOGLE_SHEET_NAME || '').trim();
        if (sheetName) {
            params.set('sheet', sheetName);
        }

        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;
    }

    function detectarDelimitador(cabecalho) {
        const virgulas = (cabecalho.match(/,/g) || []).length;
        const pontoVirgulas = (cabecalho.match(/;/g) || []).length;
        return pontoVirgulas > virgulas ? ';' : ',';
    }

    function parseCsv(textoCsv) {
        const texto = String(textoCsv || '').replace(/^\uFEFF/, '').trim();
        if (!texto) return [];

        const primeiraLinha = texto.split(/\r?\n/, 1)[0] || '';
        const delimitador = detectarDelimitador(primeiraLinha);

        const linhas = [];
        let linhaAtual = [];
        let campoAtual = '';
        let emAspas = false;

        for (let i = 0; i < texto.length; i++) {
            const char = texto[i];
            const proximo = texto[i + 1];

            if (emAspas) {
                if (char === '"' && proximo === '"') {
                    campoAtual += '"';
                    i++;
                } else if (char === '"') {
                    emAspas = false;
                } else {
                    campoAtual += char;
                }
                continue;
            }

            if (char === '"') {
                emAspas = true;
            } else if (char === delimitador) {
                linhaAtual.push(campoAtual.trim());
                campoAtual = '';
            } else if (char === '\r' && proximo === '\n') {
                linhaAtual.push(campoAtual.trim());
                linhas.push(linhaAtual);
                linhaAtual = [];
                campoAtual = '';
                i++;
            } else if (char === '\n' || char === '\r') {
                linhaAtual.push(campoAtual.trim());
                linhas.push(linhaAtual);
                linhaAtual = [];
                campoAtual = '';
            } else {
                campoAtual += char;
            }
        }

        if (campoAtual.length > 0 || linhaAtual.length > 0) {
            linhaAtual.push(campoAtual.trim());
            linhas.push(linhaAtual);
        }

        if (linhas.length < 2) return [];

        const headers = linhas[0].map((h) => normalizarTexto(h).replace(/\s+/g, '_'));
        return linhas.slice(1)
            .filter((row) => row.some((cell) => cell !== ''))
            .map((row) => {
                const obj = {};
                headers.forEach((header, idx) => {
                    obj[header] = row[idx] ?? '';
                });
                return obj;
            });
    }

    function normalizarTexto(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function normalizarCategoria(valor) {
        const cat = normalizarTexto(valor).replace(/\s+/g, '_');
        if (cat === 'copo' || cat === 'copos' || cat === 'tamanho') return 'copo';
        if (cat === 'adicional_gratis' || cat === 'gratis' || cat === 'adicionais_gratis') return 'adicional_gratis';
        if (cat === 'adicional_pago' || cat === 'pago' || cat === 'adicionais_pagos') return 'adicional_pago';
        return cat;
    }

    function parsePreco(valor) {
        const limpo = String(valor || '')
            .replace(/R\$/gi, '')
            .replace(/\s+/g, '')
            .replace(/\.(?=\d{3}(?:[,.]|$))/g, '')
            .replace(',', '.');
        const numero = Number.parseFloat(limpo);
        return Number.isFinite(numero) && numero >= 0 ? numero : 0;
    }

    function parseAtivo(valor) {
        const norm = normalizarTexto(valor);
        if (!norm) return true;
        if (['nao', 'no', 'false', '0', 'n', 'inativo', 'indisponivel', 'esgotado'].includes(norm)) {
            return false;
        }
        return true;
    }

    function parseEstoque(valor) {
        const norm = normalizarTexto(valor);
        if (!norm) return 0;
        if (['nao', 'no', 'false', 'indisponivel', 'esgotado'].includes(norm)) return 0;
        if (['sim', 'yes', 'true', 'disponivel'].includes(norm)) return 99;

        const numero = Number.parseInt(norm, 10);
        return Number.isFinite(numero) && numero > 0 ? numero : 0;
    }

    function converterLinhaProduto(row, index) {
        const categoria = normalizarCategoria(row.categoria);
        const nome = String(row.nome || '').trim();
        if (!categoria || !nome) return null;

        const id = String(row.id || '').trim() || `${categoria}-${normalizarTexto(nome).replace(/[^a-z0-9]+/g, '-')}-${index}`;
        const preco = parsePreco(row.preco);
        const estoque = parseEstoque(row.estoque);
        const ativo = parseAtivo(row.ativo);

        return {
            id,
            categoria,
            nome,
            preco,
            estoque,
            ativo,
        };
    }

    async function carregarCatalogo(config = window.ENCANTO_CONFIG) {
        const fallback = (config.CATALOGO_PADRAO || []).map((item) => ({ ...item }));
        const urlCsv = montarUrlCsv(config);

        if (!urlCsv) {
            return {
                produtos: fallback,
                origem: 'padrao',
                atualizadoEm: new Date(),
            };
        }

        try {
            const resposta = await fetch(urlCsv, { cache: 'no-store' });
            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status} ao consultar planilha`);
            }

            const textoCsv = await resposta.text();
            if (textoCsv.trim().startsWith('<!DOCTYPE html') || textoCsv.trim().startsWith('<html')) {
                throw new Error('A planilha retornou HTML em vez de CSV. Verifique se o compartilhamento está público.');
            }

            const linhas = parseCsv(textoCsv);
            const produtos = linhas
                .map(converterLinhaProduto)
                .filter(Boolean);

            if (produtos.length === 0) {
                throw new Error('Planilha sem produtos válidos.');
            }

            return {
                produtos,
                origem: 'sheets',
                atualizadoEm: new Date(),
            };
        } catch (erro) {
            console.warn('[Encanto do Açaí] Falha ao carregar Google Sheets, usando catálogo padrão:', erro);
            return {
                produtos: fallback,
                origem: 'padrao',
                erro: erro.message,
                atualizadoEm: new Date(),
            };
        }
    }

    function getEstoqueDisponivel(produto, quantidadeReservada = 0) {
        if (!produto || !produto.ativo) return 0;
        return Math.max(0, produto.estoque - quantidadeReservada);
    }

    function isProdutoDisponivel(produto, quantidadeReservada = 0) {
        return getEstoqueDisponivel(produto, quantidadeReservada) > 0;
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    }

    return {
        carregarCatalogo,
        getEstoqueDisponivel,
        isProdutoDisponivel,
        formatarMoeda,
    };
})();
