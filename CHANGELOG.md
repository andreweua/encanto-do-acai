# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
