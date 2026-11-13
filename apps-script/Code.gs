/**
 * Google Apps Script — API de Estoque e Pedidos (Caixa / Cozinha / Fila)
 * Encanto do Açaí
 *
 * Após atualizar este arquivo no editor do Apps Script:
 * 1. Mantenha o seu `ADMIN_PIN` configurado abaixo.
 * 2. Clique em: Implantar > Gerenciar implantações > Editar (lápis) > Versão: Nova versão > Implantar.
 */

const ADMIN_PIN = 'encantodoacai2026'; // Mantenha sua senha secreta aqui
const ABA_ESTOQUE = 'Estoque';
const ABA_PEDIDOS = 'Pedidos';
const ABA_EMPRESA = 'Empresa';
const TIMEZONE_LOJA = 'America/Sao_Paulo';

const CABECALHO_ESTOQUE = ['id', 'categoria', 'nome', 'preco', 'estoque', 'ativo'];
const CABECALHO_EMPRESA = ['chave', 'valor'];
const CABECALHO_PEDIDOS = [
  'numero',
  'dataHora',
  'status',
  'estoqueBaixado',
  'clienteNome',
  'clienteWhatsapp',
  'tipoEntrega',
  'endereco',
  'pagamento',
  'troco',
  'total',
  'itensJson',
  'atualizadoEm',
];

function obterOuCriarAba(ss, nomeAba, cabecalho, usarPrimeiraSeVazia) {
  let aba = ss.getSheetByName(nomeAba);
  if (!aba && usarPrimeiraSeVazia) {
    const primeira = ss.getSheets()[0];
    if (primeira && (primeira.getLastRow() === 0 || primeira.getName() === 'Página1' || primeira.getName() === 'Sheet1')) {
      primeira.setName(nomeAba);
      aba = primeira;
    }
  }
  if (!aba) {
    aba = ss.insertSheet(nomeAba);
  }
  if (aba.getLastRow() === 0 && cabecalho && cabecalho.length > 0) {
    const headerRange = aba.getRange(1, 1, 1, cabecalho.length);
    headerRange.setValues([cabecalho]);
    headerRange
      .setBackground('#380B4E')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function responderJson(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizarAtivo(valor) {
  if (typeof valor === 'boolean') return valor;
  const texto = String(valor || '').trim().toLowerCase();
  if (!texto) return true;
  return !['nao', 'não', 'no', 'false', '0', 'n', 'inativo', 'indisponivel', 'esgotado'].includes(texto);
}

function lerProdutosDaAba(aba) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, CABECALHO_ESTOQUE.length).getValues();
  const headers = valores[0].map((h) => String(h || '').trim().toLowerCase());

  const idxId = headers.indexOf('id');
  const idxCategoria = headers.indexOf('categoria');
  const idxNome = headers.indexOf('nome');
  const idxPreco = headers.indexOf('preco');
  const idxEstoque = headers.indexOf('estoque');
  const idxAtivo = headers.indexOf('ativo');

  const produtos = [];

  for (let i = 1; i < valores.length; i++) {
    const row = valores[i];
    const categoria = idxCategoria >= 0 ? String(row[idxCategoria] || '').trim() : '';
    const nome = idxNome >= 0 ? String(row[idxNome] || '').trim() : '';
    if (!categoria || !nome) continue;

    const id = idxId >= 0 && row[idxId] ? String(row[idxId]).trim() : `item-${i}`;
    const precoRaw = idxPreco >= 0 ? row[idxPreco] : 0;
    const preco = typeof precoRaw === 'number'
      ? precoRaw
      : parseFloat(String(precoRaw || '0').replace(/R\$/gi, '').replace(',', '.').trim()) || 0;

    const estoqueRaw = idxEstoque >= 0 ? row[idxEstoque] : 0;
    const estoqueNum = typeof estoqueRaw === 'number'
      ? estoqueRaw
      : parseFloat(String(estoqueRaw || '0').replace(',', '.').trim()) || 0;
    const estoque = Math.max(0, Math.round(estoqueNum * 1000) / 1000);
    const ativo = idxAtivo >= 0 ? normalizarAtivo(row[idxAtivo]) : true;

    produtos.push({ id, categoria, nome, preco, estoque, ativo });
  }

  return produtos;
}

function gravarProdutosNaAba(aba, produtos) {
  aba.clearContents();

  const linhas = [CABECALHO_ESTOQUE];
  produtos.forEach((p) => {
    const est = Math.max(0, Math.round((Number(p.estoque) || 0) * 1000) / 1000);
    linhas.push([
      String(p.id || '').trim(),
      String(p.categoria || '').trim(),
      String(p.nome || '').trim(),
      Number(p.preco || 0),
      est,
      p.ativo === false ? 'NÃO' : 'SIM',
    ]);
  });

  const range = aba.getRange(1, 1, linhas.length, CABECALHO_ESTOQUE.length);
  range.setValues(linhas);

  const headerRange = aba.getRange(1, 1, 1, CABECALHO_ESTOQUE.length);
  headerRange
    .setBackground('#380B4E')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');

  if (linhas.length > 1) {
    aba.getRange(2, 4, linhas.length - 1, 1).setNumberFormat('0.00');
    aba.getRange(2, 5, linhas.length - 1, 1).setNumberFormat('0.###');
  }

  aba.setFrozenRows(1);
}

function lerPedidosDaAba(aba) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const valores = aba.getRange(1, 1, ultimaLinha, CABECALHO_PEDIDOS.length).getValues();
  const pedidos = [];

  for (let i = 1; i < valores.length; i++) {
    const row = valores[i];
    const numero = String(row[0] || '').trim();
    if (!numero) continue;

    let itens = [];
    try {
      itens = JSON.parse(String(row[11] || '[]'));
    } catch (_err) {
      itens = [];
    }

    pedidos.push({
      rowIndex: i + 1,
      numero,
      dataHora: String(row[1] || ''),
      status: String(row[2] || 'Aguardando Caixa'),
      estoqueBaixado: String(row[3] || 'NÃO') === 'SIM',
      clienteNome: String(row[4] || ''),
      clienteWhatsapp: String(row[5] || ''),
      tipoEntrega: String(row[6] || 'Entrega'),
      endereco: String(row[7] || ''),
      pagamento: String(row[8] || 'Pix'),
      troco: String(row[9] || ''),
      total: Number(row[10] || 0),
      itens: Array.isArray(itens) ? itens : [],
      atualizadoEm: String(row[12] || ''),
    });
  }

  return pedidos;
}

function gerarNumeroPedido(abaPedidos) {
  const agora = new Date();
  const dataPrefixo = Utilities.formatDate(agora, TIMEZONE_LOJA, 'yyyyMMdd');
  const pedidos = lerPedidosDaAba(abaPedidos);

  let maiorSeq = 0;
  pedidos.forEach((p) => {
    if (p.numero.indexOf(`${dataPrefixo}-`) === 0) {
      const parte = parseInt(p.numero.split('-')[1], 10);
      if (!isNaN(parte) && parte > maiorSeq) {
        maiorSeq = parte;
      }
    }
  });

  const proximo = String(maiorSeq + 1).padStart(3, '0');
  return `${dataPrefixo}-${proximo}`;
}

function lerEmpresaDaAba(aba) {
  const padrao = {
    nomeLoja: 'Encanto do Açaí',
    whatsapp: '5535997147481',
    horario: 'Aberto a partir das 16:40',
    endereco: '',
    mapsUrl: '',
    pixChave: '',
    pixTitular: 'ENCANTO DO ACAI',
    pixCidade: 'SAO PAULO',
  };
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return padrao;

  const valores = aba.getRange(1, 1, ultimaLinha, 2).getValues();
  for (let i = 1; i < valores.length; i++) {
    const chave = String(valores[i][0] || '').trim();
    const valor = String(valores[i][1] || '').trim();
    if (chave && Object.prototype.hasOwnProperty.call(padrao, chave)) {
      padrao[chave] = valor;
    }
  }
  return padrao;
}

function gravarEmpresaNaAba(aba, dados) {
  aba.clearContents();
  const chaves = ['nomeLoja', 'whatsapp', 'horario', 'endereco', 'mapsUrl', 'pixChave', 'pixTitular', 'pixCidade'];
  const linhas = [CABECALHO_EMPRESA];
  chaves.forEach((k) => {
    linhas.push([k, String((dados && dados[k]) || '').trim()]);
  });
  aba.getRange(1, 1, linhas.length, 2).setValues(linhas);
  const headerRange = aba.getRange(1, 1, 1, 2);
  headerRange.setBackground('#380B4E').setFontColor('#FFFFFF').setFontWeight('bold');
  aba.setFrozenRows(1);
}

function ajustarEstoquePorItens(ss, itens, direcao) {
  const abaEstoque = obterOuCriarAba(ss, ABA_ESTOQUE, CABECALHO_ESTOQUE, true);
  const produtos = lerProdutosDaAba(abaEstoque);
  if (produtos.length === 0) return false;

  const fator = direcao >= 0 ? 1 : -1;
  let mlTotal = 0;
  const consumoPorId = {};

  itens.forEach((item) => {
    const vol = Number(item.volumeMl || 0);
    if (vol > 0) mlTotal += vol;

    if (item.copoId) {
      consumoPorId[item.copoId] = (consumoPorId[item.copoId] || 0) + 1;
    }
    (item.gratisIds || []).forEach((id) => {
      consumoPorId[id] = (consumoPorId[id] || 0) + 1;
    });
    (item.pagosIds || []).forEach((id) => {
      consumoPorId[id] = (consumoPorId[id] || 0) + 1;
    });
  });

  const litrosTotal = mlTotal / 1000;

  produtos.forEach((prod) => {
    if (prod.categoria === 'acai' && litrosTotal > 0) {
      prod.estoque = Math.max(0, Math.round((prod.estoque + fator * litrosTotal) * 1000) / 1000);
      return;
    }
    if (prod.categoria !== 'copo' && consumoPorId[prod.id]) {
      prod.estoque = Math.max(0, Math.round((prod.estoque + fator * consumoPorId[prod.id]) * 1000) / 1000);
    }
  });

  gravarProdutosNaAba(abaEstoque, produtos);
  return true;
}

function calcularFilaPublica(pedidos, numeroAlvo) {
  const statusNaFila = ['Aguardando Caixa', 'Em Preparo'];
  const ativos = pedidos.filter((p) => ['Aguardando Caixa', 'Em Preparo', 'Pronto'].indexOf(p.status) >= 0);

  const fila = ativos.map((p) => ({
    numero: p.numero,
    status: p.status,
    tipoEntrega: p.tipoEntrega,
    dataHora: p.dataHora,
  }));

  let pedidoEncontrado = null;
  let posicaoFila = 0;
  let pedidosNaFrente = 0;

  if (numeroAlvo) {
    const alvo = pedidos.find((p) => p.numero === numeroAlvo);
    if (alvo) {
      if (statusNaFila.indexOf(alvo.status) >= 0) {
        const naFila = pedidos.filter((p) => statusNaFila.indexOf(p.status) >= 0);
        const idx = naFila.findIndex((p) => p.numero === numeroAlvo);
        if (idx >= 0) {
          posicaoFila = idx + 1;
          pedidosNaFrente = idx;
        }
      }
      pedidoEncontrado = {
        numero: alvo.numero,
        dataHora: alvo.dataHora,
        status: alvo.status,
        tipoEntrega: alvo.tipoEntrega,
        total: alvo.total,
        atualizadoEm: alvo.atualizadoEm,
        itensResumo: alvo.itens.map((it) => ({
          copoNome: it.copoNome || '',
          gratisNomes: it.gratisNomes || [],
          pagosNomes: it.pagosNomes || [],
          observacao: it.observacao || '',
          subtotal: Number(it.subtotal || 0),
        })),
        posicaoFila,
        pedidosNaFrente,
      };
    }
  }

  return { fila, pedido: pedidoEncontrado };
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || 'catalogo').trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'fila') {
      const abaPedidos = obterOuCriarAba(ss, ABA_PEDIDOS, CABECALHO_PEDIDOS, false);
      const pedidos = lerPedidosDaAba(abaPedidos);
      const numero = String(params.numero || '').trim();
      const resultado = calcularFilaPublica(pedidos, numero);
      return responderJson({
        ok: true,
        fila: resultado.fila,
        pedido: resultado.pedido,
        updatedAt: new Date().toISOString(),
      });
    }

    if (action === 'empresa') {
      const abaEmpresa = obterOuCriarAba(ss, ABA_EMPRESA, CABECALHO_EMPRESA, false);
      const empresa = lerEmpresaDaAba(abaEmpresa);
      return responderJson({
        ok: true,
        empresa,
        updatedAt: new Date().toISOString(),
      });
    }

    if (action === 'pedidos') {
      const pin = String(params.pin || '').trim();
      if (!pin || pin !== ADMIN_PIN) {
        return responderJson({ ok: false, error: 'PIN inválido para consultar pedidos.' });
      }
      const abaPedidos = obterOuCriarAba(ss, ABA_PEDIDOS, CABECALHO_PEDIDOS, false);
      const abaEmpresa = obterOuCriarAba(ss, ABA_EMPRESA, CABECALHO_EMPRESA, false);
      const pedidos = lerPedidosDaAba(abaPedidos);
      const empresa = lerEmpresaDaAba(abaEmpresa);
      return responderJson({
        ok: true,
        pedidos,
        empresa,
        updatedAt: new Date().toISOString(),
      });
    }

    const aba = obterOuCriarAba(ss, ABA_ESTOQUE, CABECALHO_ESTOQUE, true);
    const produtos = lerProdutosDaAba(aba);
    const abaEmpresa = obterOuCriarAba(ss, ABA_EMPRESA, CABECALHO_EMPRESA, false);
    const empresa = lerEmpresaDaAba(abaEmpresa);
    return responderJson({
      ok: true,
      origem: 'apps_script',
      sheetName: aba.getName(),
      produtos,
      empresa: {
        nomeLoja: empresa.nomeLoja,
        whatsapp: empresa.whatsapp,
        horario: empresa.horario,
        endereco: empresa.endereco,
        mapsUrl: empresa.mapsUrl,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (erro) {
    return responderJson({
      ok: false,
      error: erro.message || 'Erro ao ler planilha.',
    });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || 'salvar_estoque').trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'criar_pedido') {
      const pedido = body.pedido || {};
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      if (itens.length === 0) {
        return responderJson({ ok: false, error: 'Pedido sem itens.' });
      }

      const abaPedidos = obterOuCriarAba(ss, ABA_PEDIDOS, CABECALHO_PEDIDOS, false);
      const numero = gerarNumeroPedido(abaPedidos);
      const agoraStr = Utilities.formatDate(new Date(), TIMEZONE_LOJA, 'dd/MM/yyyy HH:mm');

      abaPedidos.appendRow([
        numero,
        agoraStr,
        'Aguardando Caixa',
        'NÃO',
        String(pedido.clienteNome || '').trim(),
        String(pedido.clienteWhatsapp || '').trim(),
        String(pedido.tipoEntrega || 'Entrega').trim(),
        String(pedido.endereco || '').trim(),
        String(pedido.pagamento || 'Pix').trim(),
        String(pedido.troco || '').trim(),
        Number(pedido.total || 0),
        JSON.stringify(itens),
        agoraStr,
      ]);

      const pedidosAtualizados = lerPedidosDaAba(abaPedidos);
      const resumoFila = calcularFilaPublica(pedidosAtualizados, numero);

      return responderJson({
        ok: true,
        numero,
        dataHora: agoraStr,
        status: 'Aguardando Caixa',
        posicaoFila: resumoFila.pedido ? resumoFila.pedido.posicaoFila : 1,
      });
    }

    const pinRecebido = String(body.pin || '').trim();
    if (!pinRecebido || pinRecebido !== ADMIN_PIN) {
      return responderJson({
        ok: false,
        error: 'PIN incorreto. Verifique a senha configurada no Apps Script.',
      });
    }

    if (action === 'atualizar_status') {
      const numero = String(body.numero || '').trim();
      const novoStatus = String(body.status || '').trim();
      const permitidos = ['Aguardando Caixa', 'Em Preparo', 'Pronto', 'Concluído', 'Cancelado'];

      if (!numero || permitidos.indexOf(novoStatus) < 0) {
        return responderJson({ ok: false, error: 'Número ou status inválido.' });
      }

      const abaPedidos = obterOuCriarAba(ss, ABA_PEDIDOS, CABECALHO_PEDIDOS, false);
      const pedidos = lerPedidosDaAba(abaPedidos);
      const alvo = pedidos.find((p) => p.numero === numero);
      if (!alvo) {
        return responderJson({ ok: false, error: `Pedido ${numero} não encontrado.` });
      }

      let estoqueFoiBaixadoAgora = false;
      let estoqueEstornadoAgora = false;
      const deveBaixar = (novoStatus === 'Em Preparo' || novoStatus === 'Pronto') && !alvo.estoqueBaixado;
      if (deveBaixar) {
        estoqueFoiBaixadoAgora = ajustarEstoquePorItens(ss, alvo.itens, -1);
        if (estoqueFoiBaixadoAgora) {
          abaPedidos.getRange(alvo.rowIndex, 4).setValue('SIM');
        }
      } else if (novoStatus === 'Cancelado' && alvo.estoqueBaixado) {
        estoqueEstornadoAgora = ajustarEstoquePorItens(ss, alvo.itens, 1);
        if (estoqueEstornadoAgora) {
          abaPedidos.getRange(alvo.rowIndex, 4).setValue('NÃO');
        }
      }

      const agoraStr = Utilities.formatDate(new Date(), TIMEZONE_LOJA, 'dd/MM/yyyy HH:mm');
      abaPedidos.getRange(alvo.rowIndex, 3).setValue(novoStatus);
      abaPedidos.getRange(alvo.rowIndex, 13).setValue(agoraStr);

      return responderJson({
        ok: true,
        numero,
        status: novoStatus,
        estoqueBaixado: estoqueEstornadoAgora ? false : (alvo.estoqueBaixado || estoqueFoiBaixadoAgora),
        estoqueBaixadoAgora: estoqueFoiBaixadoAgora,
        estoqueEstornadoAgora: estoqueEstornadoAgora,
        atualizadoEm: agoraStr,
      });
    }

    if (action === 'editar_pedido') {
      const numero = String(body.numero || '').trim();
      const dados = body.pedido || {};
      if (!numero) {
        return responderJson({ ok: false, error: 'Número do pedido é obrigatório.' });
      }

      const abaPedidos = obterOuCriarAba(ss, ABA_PEDIDOS, CABECALHO_PEDIDOS, false);
      const pedidos = lerPedidosDaAba(abaPedidos);
      const alvo = pedidos.find((p) => p.numero === numero);
      if (!alvo) {
        return responderJson({ ok: false, error: `Pedido ${numero} não encontrado.` });
      }

      const novosItens = Array.isArray(dados.itens) && dados.itens.length > 0 ? dados.itens : alvo.itens;
      if (alvo.estoqueBaixado && Array.isArray(dados.itens) && dados.itens.length > 0) {
        ajustarEstoquePorItens(ss, alvo.itens, 1);
        ajustarEstoquePorItens(ss, novosItens, -1);
      }

      const agoraStr = Utilities.formatDate(new Date(), TIMEZONE_LOJA, 'dd/MM/yyyy HH:mm');
      const clienteNome = dados.clienteNome !== undefined ? String(dados.clienteNome).trim() : alvo.clienteNome;
      const clienteWhatsapp = dados.clienteWhatsapp !== undefined ? String(dados.clienteWhatsapp).trim() : alvo.clienteWhatsapp;
      const tipoEntrega = dados.tipoEntrega !== undefined ? String(dados.tipoEntrega).trim() : alvo.tipoEntrega;
      const endereco = dados.endereco !== undefined ? String(dados.endereco).trim() : alvo.endereco;
      const pagamento = dados.pagamento !== undefined ? String(dados.pagamento).trim() : alvo.pagamento;
      const troco = dados.troco !== undefined ? String(dados.troco).trim() : alvo.troco;
      const total = dados.total !== undefined ? Number(dados.total || 0) : alvo.total;

      abaPedidos.getRange(alvo.rowIndex, 5, 1, 9).setValues([[
        clienteNome,
        clienteWhatsapp,
        tipoEntrega,
        endereco,
        pagamento,
        troco,
        total,
        JSON.stringify(novosItens),
        agoraStr,
      ]]);

      return responderJson({
        ok: true,
        numero,
        atualizadoEm: agoraStr,
      });
    }

    if (action === 'salvar_empresa') {
      const empresa = body.empresa || {};
      const abaEmpresa = obterOuCriarAba(ss, ABA_EMPRESA, CABECALHO_EMPRESA, false);
      gravarEmpresaNaAba(abaEmpresa, empresa);
      return responderJson({
        ok: true,
        empresa: lerEmpresaDaAba(abaEmpresa),
        updatedAt: new Date().toISOString(),
      });
    }

    const produtos = Array.isArray(body.produtos) ? body.produtos : [];
    if (produtos.length === 0) {
      return responderJson({
        ok: false,
        error: 'Lista de produtos vazia.',
      });
    }

    const aba = obterOuCriarAba(ss, ABA_ESTOQUE, CABECALHO_ESTOQUE, true);
    gravarProdutosNaAba(aba, produtos);

    return responderJson({
      ok: true,
      total: produtos.length,
      sheetName: aba.getName(),
      updatedAt: new Date().toISOString(),
    });
  } catch (erro) {
    return responderJson({
      ok: false,
      error: erro.message || 'Erro ao processar requisição.',
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_e) {}
  }
}
