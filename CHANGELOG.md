# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.8.11] - 2026-11-20

### Corrigido
- **Formatação organizada dos Cupons no WhatsApp (`js/app.js`, `js/pedidos-painel.js`):** Removido o bloco monoespaçado de 32 colunas que quebrava linhas em celulares com fonte maior e impedia negrito/links. Adotado layout de cupom organizado (divisórias de 26 caracteres, campos alinhados à esquerda com negrito nativo do WhatsApp, itens indentados e código PIX limpo no final da mensagem).

## [1.8.10] - 2026-11-20

### Alterado
- **Todas as mensagens enviadas ao cliente em formato de Cupom Fiscal (`js/pedidos-painel.js`):** Padronizadas as mensagens do Caixa para o cliente (**Pedido Pronto**, **Confirmação de Forma de Pagamento** e **Cobrança PIX Copia e Cola**) no layout de cupom monoespaçado de 32 colunas, incluindo itens detalhados do pedido, total, instruções claras e código PIX isolado para cópia fácil.

## [1.8.9] - 2026-11-20

### Corrigido
- **Cozinha não pode finalizar pedido sem confirmação do Caixa (`js/pedidos-painel.js`, `apps-script/Code.gs`):** Pedidos em `Aguardando Caixa` agora mostram aviso e botão bloqueado na Cozinha. Regra reforçada no front-end e no servidor: só é possível marcar `Pronto` se o status atual for `Em Preparo`. **Requer nova implantação do `Code.gs` no Apps Script.**

## [1.8.8] - 2026-11-20

### Alterado
- **Mensagem do PIX Copia e Cola enviada ao cliente (`js/pedidos-painel.js`):** Layout organizado com cabeçalho da loja, separadores, pedido/valor/favorecido, passo a passo de pagamento e o código em bloco monoespaçado (fácil de selecionar e copiar). Emojis passaram a usar escape Unicode para não quebrar (`�`) em nenhum aparelho.

## [1.8.7] - 2026-11-20

### Alterado
- **Acompanhamento de Pedido e Fila (`acompanhar.html`, `js/acompanhar.js`, `apps-script/Code.gs`):** Para o cliente, mantidos os cards **"Acompanhar Pedido e Fila"** e **"Seu Pedido"**, calculando a posição exclusivamente pelos pedidos anteriores ao do cliente que estão em preparo (`Em Preparo`) ou aguardando aprovação (`Aguardando Caixa`). A listagem geral da fila de pedidos fica restrita à visão administrativa.

## [1.8.6] - 2026-11-20

### Alterado
- **Mensagem do pedido no WhatsApp em formato de Cupom Fiscal (`js/app.js`):** Restaurado o layout monoespaçado de cupom fiscal (`32` colunas em bloco ```` ``` ````) com cabeçalho, data/hora, número do pedido, copos, adicionais grátis e pagos alinhados, observações, subtotal, total, dados do cliente (incluindo WhatsApp), assinatura PereiraLabs com versão dinâmica e link clicável de acompanhamento na fila.

## [1.8.5] - 2026-11-20

### Alterado
- **Ampliação do pop-up e fontes de instalação do PWA (`js/pwa.js`):** Aumentada a largura e o espaçamento do modal (`max-width: 520px`), ícone (`84px`), título (`2.1rem`), descrição (`1.2rem`), lista de benefícios (`1.12rem`), botões (`1.15rem`–`1.25rem`) e pílula discreta (`1.05rem`).

## [1.8.4] - 2026-11-20

### Alterado
- **Fluxo de instalação do PWA (`js/pwa.js`):** Exibição inicial em pop-up centralizado maior com ícone e benefícios do app; ao tocar em "OK, deixar para depois" (ou fechar), recolhe para uma pílula discreta ("📲 Baixar App") no canto inferior. Relembra periodicamente (a cada 36h ou 4 acessos) caso o PWA ainda não tenha sido instalado, com opção permanente de **"Não lembrar novamente"**.

## [1.8.3] - 2026-11-20

### Corrigido
- **Cards de Funcionamento, Pagamentos e Entrega/Retirada (`index.html`):** Textos saíam do card com as fontes maiores. Grid agora é 1 coluna no celular e 3 a partir de tablet, com `min-w-0` e quebra de linha dentro do card.
- **Proteção global (`css/app.css`):** `overflow-wrap` no corpo e `min-width: 0` nos filhos de cards, para o conteúdo ficar sempre dentro do card e legível.

## [1.8.2] - 2026-11-20

### Adicionado
- **Versão e build no rodapé (`js/versao.js`):** Todas as páginas exibem "Versão X • Build Y" acima da assinatura "Desenvolvido por". Fonte única de versão/build para atualizar a cada release.

## [1.8.1] - 2026-11-20

### Alterado
- **Fontes maiores no PWA (`css/app.css`):** Base de 18px (19px no celular) e piso global de tamanho para `text-xs`, `text-[10px]` e `text-[11px]`, com campos e botões de toque maiores.

## [1.8.0] - 2026-11-20

### Corrigido
- **PWA (`manifest.webmanifest`, `sw.js`, `js/pwa.js`):** Adicionado `id`, removida a trava de orientação `portrait`, ícones `any` e `maskable` separados e `type` nos atalhos. O Service Worker agora usa `Promise.allSettled` na instalação, `ignoreSearch` no fallback offline (URLs com `?v=` e `?pedido=`), fallback para `index.html` em navegações e cache das CDNs de estilo/fontes (sem cachear o Google Apps Script/Sheets).

### Adicionado
- **Banner de instalação do app (`js/pwa.js`):** Botão de instalar (Android/Desktop), instruções para iOS Safari e aviso para abrir fora de navegadores internos (WhatsApp/Instagram), dispensável por 7 dias.
- **Meta tags PWA/iOS** em todas as páginas.

### Alterado
- **Tipografia mais confortável (`css/app.css`, páginas HTML e `js/*.js`):** Fonte base de 16px (17px no mobile), `line-height` 1.55, campos e botões com altura mínima de toque e textos de 10-12px elevados para `text-sm`/`text-base`/`text-lg` no cardápio, na fila, no Caixa, na Cozinha e no Admin.

## [1.7.0] - 2026-11-13

### Adicionado
- **WhatsApp obrigatório no pedido (`index.html`, `js/app.js`):** Validação mínima de 10 dígitos com DDD para que o Caixa possa contatar o cliente mesmo que ele não conclua o envio da mensagem no WhatsApp.
- **Edição e cancelamento de pedidos no Caixa e no Admin (`caixa.html`, `admin.html`, `js/pedidos-painel.js`, `js/admin.js`, `apps-script/Code.gs`):** Modal completo para editar dados, pagamento, copos, adicionais e observações (`editar_pedido`), além de cancelamento com **estorno automático** do estoque caso já tenha sido baixado.
- **Gerenciamento de pagamento + PIX Copia e Cola (`js/pix.js`, `js/pedidos-painel.js`):** No Caixa, agora é possível conversar com o cliente no WhatsApp para confirmar a forma de pagamento (`Pix`, `Cartão de Crédito`, `Cartão de Débito`, `Dinheiro`), alterar pagamento/troco e gerar código **PIX Copia e Cola (BR Code)** pronto para enviar no WhatsApp.
- **Seção Dados da Empresa & PIX no Admin (`admin.html`, `js/admin.js`, `apps-script/Code.gs`):** Persistência da loja, endereço, horário, WhatsApp e chave/titular/cidade PIX na aba `Empresa` da planilha.

## [1.6.0] - 2026-11-13

### Adicionado
- **PWA Instalável (`manifest.webmanifest`, `sw.js`, `js/pwa.js`, `assets/icon-192.png`, `assets/icon-512.png`):** O cardápio e os painéis agora podem ser instalados no celular como aplicativo, com atalhos para Fila, Caixa e Cozinha, sem cachear chamadas ao Google Sheets.
- **Link curto sem terceiros (`f/index.html`):** Rota curta `/f/?YYYYMMDD-NNN` que redireciona automaticamente para `acompanhar.html?pedido=YYYYMMDD-NNN`, reduzindo o tamanho da URL enviada no WhatsApp.
- **Tipografia ampliada no mobile (`css/app.css`):** Aumento proporcional da fonte base em telas menores (`<= 640px`) e proteção contra zoom automático em campos de formulário no iOS.

## [1.5.1] - 2026-11-12

### Corrigido
- **Envio dos itens escolhidos para Caixa, Cozinha e Fila (`js/app.js`):** `registrarPedidoNaPlanilha` agora resolve `copoNome`, `gratisNomes`, `pagosNomes`, `observacao`, `subtotal` e `total` via `obterResumoCopo(item)`, garantindo que todas as escolhas do cliente apareçam nos painéis e no acompanhamento.
- **Legibilidade do pedido no WhatsApp (`js/app.js`):** Substituído o bloco ASCII de largura fixa (que quebrava linhas no celular) por uma mensagem estruturada com tópicos claros (`*ITENS DO PEDIDO*`, `*RESUMO*`, `*DADOS DO CLIENTE*` e link de acompanhamento).
- **Observações na página de acompanhamento (`js/acompanhar.js`):** Exibição das observações e dos adicionais grátis/pagos de cada copo no cartão do pedido.

## [1.5.0] - 2026-11-12

### Adicionado
- **Fluxo completo de pedidos (Caixa + Cozinha + Fila Pública):**
  - `caixa.html`: Painel do Caixa para confirmar pedidos (`Aguardando Caixa` -> `Em Preparo`), acompanhar pedidos prontos e notificar o cliente no WhatsApp antes de concluir (`Concluído`).
  - `cozinha.html`: Painel da Cozinha em tempo real para preparar os pedidos confirmados pelo Caixa e marcá-los como `Pronto`.
  - `acompanhar.html` + `js/acompanhar.js`: Página pública para o cliente acompanhar o status do seu pedido e a fila de espera em tempo real.
  - `js/pedidos-painel.js`: Controlador compartilhado de pedidos para Caixa e Cozinha com atualização automática a cada 15 segundos e autenticação por PIN.
- **Baixa automática de estoque no Google Sheets (`apps-script/Code.gs`):**
  - Nova aba `Pedidos` criada automaticamente com controle de concorrência (`LockService`).
  - Numeração sequencial diária no formato `DDMMYYYY-NNN` (ex.: `12112026-001`).
  - Ao confirmar o pedido no Caixa (`Em Preparo`), o sistema deduz automaticamente os litros de açaí (`acai-litros`) e cada adicional (`gratisIds` e `pagosIds`) de forma idempotente (`estoqueBaixado = 'SIM'`).

### Alterado
- `index.html` e `js/app.js`: Registro automático do pedido na planilha antes de abrir o WhatsApp, exibição do cartão de pedido registrado com link para a fila (`acompanhar.html?pedido=...`) e inclusão do link no cupom.
- `admin.html`: Navegação integrada entre `Estoque`, `Caixa`, `Cozinha`, `Fila` e `Cardápio`.

## [1.4.2] - 2026-11-12

### Corrigido
- Disponibilidade dos copos agora é calculada **exclusivamente pelos litros de açaí** (`acai-litros`); a quantidade manual por tamanho deixou de limitar as vendas (antes travava em `20`).
- Painel `admin.html` substituiu os controles `- / +` dos copos por um indicador somente leitura com a quantidade calculada automaticamente.

## [1.4.1] - 2026-11-12

### Alterado
- Configurada a `APPS_SCRIPT_URL` oficial em `js/config.js` para conectar o cardápio e o painel admin ao Google Sheets em produção.
- Adicionado versionamento `?v=1.4.1` nas tags `<script>` de `index.html` e `admin.html` para evitar cache desatualizado no navegador.

## [1.4.0] - 2026-11-12

### Alterado
- Controle de estoque do açaí alterado para **Litros de Açaí** (`acai-litros`, categoria `acai`), com conversão automática para a quantidade equivalente de copos (`200 ml` a `700 ml`) conforme o saldo restante em mililitros.
- Montador de pedidos (`js/app.js` e `js/estoque.js`) agora desconta os `ml` já reservados na sacola ao validar os tamanhos restantes; tamanhos maiores que o saldo restante ficam **Indisponíveis** automaticamente.
- Painel `admin.html` ganhou o card **Estoque de Açaí (Litros)** com ajustes rápidos (`-1 L`, `-0,5 L`, `+0,5 L`, `+1 L`) e visualização em tempo real de quantos copos de cada tamanho o estoque atual rende.
- `apps-script/Code.gs` e parser CSV atualizados para aceitar e formatar quantidades decimais (ex.: `2.5` litros).

## [1.3.0] - 2026-11-12

### Adicionado
- Painel administrativo `admin.html` + `js/admin.js` para gerenciar estoque visualmente (botões `+/-`, pausa rápido `Ativo/Pausado`, edição de preços, filtros e criação de novos itens).
- Integração bidirecional com Google Sheets via `apps-script/Code.gs`: o botão **Enviar para Planilha** cria/atualiza cabeçalho e produtos direto na planilha sem precisar importar CSV manualmente, protegido por `ADMIN_PIN`.
- Suporte em `js/estoque.js` e `js/config.js` (`APPS_SCRIPT_URL`) para o cardápio ler diretamente da mesma URL do Apps Script caso não haja CSV configurado.

## [1.2.2] - 2026-11-12

### Adicionado
- Assinatura padrão da **PereiraLabs - Divisão de Tecnologia e IA | Louzada & Pereira - Soluções Digitais** (com versão) no rodapé do cupom fiscal enviado via WhatsApp.

## [1.2.1] - 2026-11-12

### Alterado
- Mensagem de pedido enviada ao WhatsApp (`gerarMensagemWhatsApp` em `js/app.js`) reformatada em layout de cupom fiscal monoespaçado (`34` colunas) com data, hora, número do pedido, itens alinhados, adicionais grátis/pagos, observações, subtotal, total e dados do cliente.

## [1.2.0] - 2026-11-12

### Adicionado
- Meta tags de SEO, Open Graph e Twitter Card em `index.html` com imagem de prévia para compartilhamento no WhatsApp/Instagram.
- Favicon vetorial (`assets/favicon.svg`) e imagem promocional no Hero (`assets/encanto-hero.jpg`).
- Faixa de atendimento e pagamentos (horário, Pix/Cartão/Dinheiro, entrega/retirada) e suporte opcional a endereço, Google Maps e Instagram via `js/config.js`.
- Barra flutuante de resumo rápido do pedido (`#barra-pedido-rapido`) para acompanhar quantidade e total ao rolar o cardápio.

## [1.1.0] - 2026-11-12

### Adicionado
- Montador de pedidos interativo em `index.html` e `js/app.js` (escolha de copo, adicionais grátis, adicionais pagos, observações e suporte a múltiplos copos no mesmo pedido).
- Controle de estoque em tempo real conectado ao Google Sheets via CSV público (`js/estoque.js`) com fallback automático em `js/config.js`.
- Bloqueio automático de itens sem estoque (`estoque <= 0` ou `ativo = NÃO`), exibindo selo **Indisponível** e impedindo seleção no cardápio e além do limite disponível na sacola.
- Formulário de cliente (nome, entrega/retirada, endereço, forma de pagamento e troco) com geração automática da mensagem formatada para WhatsApp.
- Planilha modelo `modelo_estoque_google_sheets.csv` pronta para importação no Google Sheets.

## [1.0.0] - 2026-11-11

### Adicionado
- Landing page inicial responsiva em `index.html` com paleta e tipografia do guia de estilos.
- Tabela de preços dos copos de açaí (`200 ml` a `700 ml`).
- Listagem de adicionais grátis e adicionais pagos.
- Botões de pedido rápido integrados ao WhatsApp `(35) 99714-7481`.
- Documentação institucional (`README.md`) e histórico de versões (`CHANGELOG.md`).
