/**
 * Google Apps Script — API de Estoque do Encanto do Açaí
 *
 * Como instalar (leva menos de 2 minutos):
 * 1. Crie uma planilha em branco no Google Sheets (https://sheets.google.com).
 * 2. No menu superior, clique em: Extensões > Apps Script.
 * 3. Apague o conteúdo padrão e cole TODO este código.
 * 4. Altere o PIN abaixo (`ADMIN_PIN`) para uma senha sua.
 * 5. Clique em: Implantar > Nova implantação > Tipo: App da Web.
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 6. Autorize o acesso e copie a "URL do app da Web" gerada.
 * 7. Cole essa URL em `APPS_SCRIPT_URL` no arquivo `js/config.js` (ou direto no `admin.html`).
 */

const ADMIN_PIN = 'encanto2026'; // TROQUE ESTE PIN ANTES DE IMPLANTAR
const ABA_PADRAO = 'Estoque';
const CABECALHO = ['id', 'categoria', 'nome', 'preco', 'estoque', 'ativo'];

function obterOuCriarAba(ss) {
  let aba = ss.getSheetByName(ABA_PADRAO);
  if (!aba) {
    aba = ss.getSheets()[0];
    if (aba.getLastRow() === 0) {
      aba.setName(ABA_PADRAO);
    }
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

  const valores = aba.getRange(1, 1, ultimaLinha, 6).getValues();
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

  const linhas = [CABECALHO];
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

  const range = aba.getRange(1, 1, linhas.length, CABECALHO.length);
  range.setValues(linhas);

  // Formatação visual amigável na planilha
  const headerRange = aba.getRange(1, 1, 1, CABECALHO.length);
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

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterOuCriarAba(ss);
    const produtos = lerProdutosDaAba(aba);

    return responderJson({
      ok: true,
      origem: 'apps_script',
      sheetName: aba.getName(),
      produtos,
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
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const pinRecebido = String(body.pin || '').trim();

    if (!pinRecebido || pinRecebido !== ADMIN_PIN) {
      return responderJson({
        ok: false,
        error: 'PIN incorreto. Verifique a senha configurada no Apps Script.',
      });
    }

    const produtos = Array.isArray(body.produtos) ? body.produtos : [];
    if (produtos.length === 0) {
      return responderJson({
        ok: false,
        error: 'Lista de produtos vazia.',
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterOuCriarAba(ss);
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
      error: erro.message || 'Erro ao salvar na planilha.',
    });
  }
}
