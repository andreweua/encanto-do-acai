# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
