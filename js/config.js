/**
 * Configurações gerais e catálogo padrão (fallback) do Encanto do Açaí.
 *
 * Para conectar sua planilha do Google Sheets:
 * 1. Importe o arquivo `modelo_estoque_google_sheets.csv` no Google Sheets.
 * 2. Compartilhe a planilha como "Qualquer pessoa com o link (Leitor)"
 *    ou use "Arquivo > Compartilhar > Publicar na web" (formato CSV).
 * 3. Cole o ID da planilha (ou a URL completa) em `GOOGLE_SHEET_ID`,
 *    ou cole o link CSV publicado em `GOOGLE_SHEET_CSV_URL`.
 */
window.ENCANTO_CONFIG = {
    APP_VERSION: 'v1.4.1',
    WHATSAPP_NUMBER: '5535997147481',
    STORE_NAME: 'Encanto do Açaí',
    OPENING_HOURS: 'Aberto a partir das 16:40',
    STORE_ADDRESS: '',
    GOOGLE_MAPS_URL: '',
    GOOGLE_MAPS_EMBED_URL: '',
    INSTAGRAM_URL: '',

    // URL do Web App do Google Apps Script (permite ler e salvar estoque direto pelo admin.html)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw044lUhTBP6q4EhI0mmx8Zg1PRy7yHpylixDhCFTMqsNmjkCWuwcJ_f880-IDaZDA-/exec',

    // Opcional (leitura CSV): ID da planilha (trecho entre /d/ e /edit) ou URL do Google Sheets
    GOOGLE_SHEET_ID: '',

    // Nome da aba na planilha (deixe vazio '' para ler automaticamente a primeira aba)
    GOOGLE_SHEET_NAME: '',

    // Opcional: link direto "Publicar na web" em formato CSV (se preenchido, tem prioridade)
    GOOGLE_SHEET_CSV_URL: '',

    // Abaixo desta quantidade, exibe o aviso discreto "Últimas X un."
    LOW_STOCK_THRESHOLD: 3,

    // Catálogo padrão utilizado quando nenhuma planilha está configurada ou em caso de falha de rede
    CATALOGO_PADRAO: [
        { id: 'acai-litros', categoria: 'acai', nome: 'Açaí (Litros)', preco: 0, estoque: 10, ativo: true },

        { id: 'copo-200', categoria: 'copo', nome: '200 ml', preco: 10.00, estoque: 50, ativo: true },
        { id: 'copo-300', categoria: 'copo', nome: '300 ml', preco: 13.00, estoque: 50, ativo: true },
        { id: 'copo-400', categoria: 'copo', nome: '400 ml', preco: 15.00, estoque: 50, ativo: true },
        { id: 'copo-500', categoria: 'copo', nome: '500 ml', preco: 17.00, estoque: 50, ativo: true },
        { id: 'copo-700', categoria: 'copo', nome: '700 ml', preco: 20.00, estoque: 50, ativo: true },

        { id: 'gratis-banana', categoria: 'adicional_gratis', nome: 'Banana', preco: 0, estoque: 30, ativo: true },
        { id: 'gratis-pacoca', categoria: 'adicional_gratis', nome: 'Paçoca', preco: 0, estoque: 30, ativo: true },
        { id: 'gratis-bis', categoria: 'adicional_gratis', nome: 'Bis', preco: 0, estoque: 25, ativo: true },
        { id: 'gratis-calda-chocolate', categoria: 'adicional_gratis', nome: 'Calda de chocolate', preco: 0, estoque: 25, ativo: true },
        { id: 'gratis-calda-morango', categoria: 'adicional_gratis', nome: 'Calda de morango', preco: 0, estoque: 25, ativo: true },
        { id: 'gratis-chantilly', categoria: 'adicional_gratis', nome: 'Chantilly', preco: 0, estoque: 20, ativo: true },
        { id: 'gratis-mousse-maracuja', categoria: 'adicional_gratis', nome: 'Mousse de maracujá', preco: 0, estoque: 20, ativo: true },
        { id: 'gratis-mousse-morango', categoria: 'adicional_gratis', nome: 'Mousse de morango', preco: 0, estoque: 20, ativo: true },
        { id: 'gratis-leite-em-po', categoria: 'adicional_gratis', nome: 'Leite em pó', preco: 0, estoque: 30, ativo: true },
        { id: 'gratis-leite-condensado', categoria: 'adicional_gratis', nome: 'Leite condensado', preco: 0, estoque: 30, ativo: true },

        { id: 'pago-nutella', categoria: 'adicional_pago', nome: 'Nutella', preco: 5.00, estoque: 15, ativo: true },
        { id: 'pago-creme-ninho', categoria: 'adicional_pago', nome: 'Creme de Ninho', preco: 5.00, estoque: 15, ativo: true },
        { id: 'pago-leite-ninho', categoria: 'adicional_pago', nome: 'Leite Ninho', preco: 3.00, estoque: 20, ativo: true },
        { id: 'pago-fini', categoria: 'adicional_pago', nome: 'Fini', preco: 2.00, estoque: 20, ativo: true },
        { id: 'pago-morango', categoria: 'adicional_pago', nome: 'Morango', preco: 3.00, estoque: 15, ativo: true },
    ],
};
