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
        if (cat === 'acai' || cat === 'base' || cat === 'base_acai' || cat === 'litros' || cat === 'acai_litros') return 'acai';
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
        if (typeof valor === 'number') {
            return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 1000) / 1000 : 0;
        }
        const norm = normalizarTexto(valor);
        if (!norm) return 0;
        if (['nao', 'no', 'false', 'indisponivel', 'esgotado'].includes(norm)) return 0;
        if (['sim', 'yes', 'true', 'disponivel'].includes(norm)) return 99;

        const limpo = norm.replace(/[^\d.,-]/g, '').replace(',', '.');
        const numero = Number.parseFloat(limpo);
        return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 1000) / 1000 : 0;
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

    async function carregarViaAppsScript(appsScriptUrl) {
        const separador = appsScriptUrl.includes('?') ? '&' : '?';
        const url = `${appsScriptUrl}${separador}_t=${Date.now()}`;
        const resposta = await fetch(url, { cache: 'no-store' });
        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status} ao consultar Apps Script`);
        }

        const json = await resposta.json();
        if (!json || json.ok === false) {
            throw new Error((json && json.error) || 'Resposta inválida do Apps Script');
        }

        const listaBruta = Array.isArray(json.produtos) ? json.produtos : [];
        return listaBruta
            .map((item, idx) => converterLinhaProduto({
                id: item.id,
                categoria: item.categoria,
                nome: item.nome,
                preco: item.preco,
                estoque: item.estoque,
                ativo: item.ativo,
            }, idx))
            .filter(Boolean);
    }

    async function carregarCatalogo(config = window.ENCANTO_CONFIG) {
        const fallback = (config.CATALOGO_PADRAO || []).map((item) => ({ ...item }));
        const urlCsv = montarUrlCsv(config);
        const appsScriptUrl = String(config.APPS_SCRIPT_URL || '').trim();

        if (!urlCsv && !appsScriptUrl) {
            return {
                produtos: fallback,
                origem: 'padrao',
                atualizadoEm: new Date(),
            };
        }

        try {
            if (urlCsv) {
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
            }

            const produtosScript = await carregarViaAppsScript(appsScriptUrl);
            if (produtosScript.length === 0) {
                return {
                    produtos: fallback,
                    origem: 'padrao',
                    vaziaNaPlanilha: true,
                    atualizadoEm: new Date(),
                };
            }

            return {
                produtos: produtosScript,
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

    function gerarCsvCatalogo(produtos) {
        const escapar = (v) => {
            const s = String(v ?? '');
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const linhas = ['id,categoria,nome,preco,estoque,ativo'];
        produtos.forEach((p) => {
            const est = Math.max(0, Math.round((Number(p.estoque) || 0) * 1000) / 1000);
            linhas.push([
                escapar(p.id),
                escapar(p.categoria),
                escapar(p.nome),
                Number(p.preco || 0).toFixed(2),
                est,
                p.ativo === false ? 'NÃO' : 'SIM',
            ].join(','));
        });
        return linhas.join('\n');
    }

    function extrairVolumeMl(copo) {
        if (!copo) return 0;
        const match = String(copo.nome || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
        if (!match) return 0;
        const numero = Number.parseFloat(match[1].replace(',', '.'));
        if (!Number.isFinite(numero) || numero <= 0) return 0;
        return match[2].toLowerCase() === 'l' ? Math.round(numero * 1000) : Math.round(numero);
    }

    function obterBaseAcai(produtos) {
        if (!Array.isArray(produtos)) return null;
        return produtos.find((p) => p.categoria === 'acai') || null;
    }

    function getAcaiRestanteMl(baseAcai, mlReservadoNaSacola = 0) {
        if (!baseAcai || !baseAcai.ativo) return 0;
        const totalMl = Math.round((Number(baseAcai.estoque) || 0) * 1000);
        return Math.max(0, totalMl - Math.max(0, Math.round(mlReservadoNaSacola)));
    }

    function getEstoqueCopoDisponivel(copo, produtos, coposDesseTamanhoReservados = 0, mlReservadoNaSacola = 0) {
        if (!copo || !copo.ativo) return 0;
        const embalagensRestantes = Math.floor(getEstoqueDisponivel(copo, coposDesseTamanhoReservados));
        if (embalagensRestantes <= 0) return 0;

        const baseAcai = obterBaseAcai(produtos);
        if (!baseAcai) return embalagensRestantes;

        const volumeMl = extrairVolumeMl(copo);
        if (volumeMl <= 0) return embalagensRestantes;

        const acaiRestanteMl = getAcaiRestanteMl(baseAcai, mlReservadoNaSacola);
        const capacidadePorLitros = Math.floor(acaiRestanteMl / volumeMl);
        return Math.min(embalagensRestantes, capacidadePorLitros);
    }

    function getEstoqueDisponivel(produto, quantidadeReservada = 0) {
        if (!produto || !produto.ativo) return 0;
        return Math.max(0, Math.round((produto.estoque - quantidadeReservada) * 1000) / 1000);
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
        carregarViaAppsScript,
        gerarCsvCatalogo,
        extrairVolumeMl,
        obterBaseAcai,
        getAcaiRestanteMl,
        getEstoqueCopoDisponivel,
        getEstoqueDisponivel,
        isProdutoDisponivel,
        formatarMoeda,
    };
})();
