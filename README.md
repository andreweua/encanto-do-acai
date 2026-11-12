# Encanto do Açaí — Cardápio Digital & Pedidos

Landing page e montador de pedidos interativo desenvolvido para o **Encanto do Açaí**, com controle de estoque em tempo real via **Google Sheets** e envio direto do pedido formatado para o WhatsApp.

---

## Stack Técnica

- **Frontend:** HTML5 Semântico, Tailwind CSS (CDN), Font Awesome 6, Vanilla JavaScript
- **Tipografia:** Google Fonts (`Lilita One`, `Pacifico`, `Montserrat`)
- **Estoque em Tempo Real:** Google Sheets (leitura via CSV público) com fallback local em `js/config.js`
- **Design System:** Documentado em [`guia_de_estilos_encanto_do_a_a.md`](./guia_de_estilos_encanto_do_a_a.md)
- **Integrações:** WhatsApp Direct API (`https://wa.me/5535997147481`)

---

## Estrutura do Projeto

```text
.
├── index.html                           # Página principal + Montador de Pedidos
├── js/
│   ├── config.js                        # Configurações, ID da planilha e catálogo padrão
│   ├── estoque.js                       # Leitura/parser CSV do Google Sheets e regras de estoque
│   └── app.js                           # Montador interativo, sacola e envio no WhatsApp
├── modelo_estoque_google_sheets.csv     # Planilha modelo pronta para importar no Google Sheets
├── guia_de_estilos_encanto_do_a_a.md    # Guia de estilos e tokens visuais
├── README.md                            # Documentação do projeto
└── CHANGELOG.md                         # Histórico de versões
```

---

## Como Conectar o Estoque no Google Sheets

1. Acesse o [Google Sheets](https://sheets.google.com) e crie uma nova planilha.
2. Importe o arquivo [`modelo_estoque_google_sheets.csv`](./modelo_estoque_google_sheets.csv) em **Arquivo > Importar > Fazer upload** (separe por vírgula).
3. Libere a leitura pública usando uma das opções abaixo:
   - **Opção A (Mais rápida):** Clique em **Compartilhar** (canto superior direito) e em *Acesso geral* selecione **Qualquer pessoa com o link** (papel **Leitor**). Copie o ID da planilha na URL (trecho entre `/d/` e `/edit`) e cole em `GOOGLE_SHEET_ID` no arquivo [`js/config.js`](./js/config.js).
   - **Opção B (Publicar na web):** Vá em **Arquivo > Compartilhar > Publicar na web**, escolha a aba de estoque e o formato **Valores separados por vírgula (.csv)**, clique em **Publicar** e cole o link gerado em `GOOGLE_SHEET_CSV_URL` no arquivo [`js/config.js`](./js/config.js).

### Como funciona o status **Indisponível** na planilha

| Coluna | Regra |
| :--- | :--- |
| `estoque` | Quantidade disponível (`0` ou `NÃO` deixa o produto **Indisponível** automaticamente) |
| `ativo` | `SIM` mantém visível para venda; `NÃO` pausa o item como **Indisponível** mesmo com saldo |
| `preco` | Aceita `10.00`, `10,00` ou `R$ 10,00` |
| `categoria` | `copo`, `adicional_gratis` ou `adicional_pago` |

> Enquanto nenhum ID de planilha for preenchido em `js/config.js`, o site funciona normalmente usando o catálogo padrão configurado no próprio arquivo.

---

## Como Executar Localmente

Para testar o carregamento de arquivos JS e `fetch` sem bloqueio de CORS local (`file://`), rode um servidor estático simples na pasta do projeto:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

---

## Deploy (GitHub Pages)

1. Publique o repositório no GitHub na branch `main`:
   ```bash
   git remote add origin https://github.com/andreweua/encanto-do-acai.git
   git push -u origin main
   ```
2. No GitHub, acesse **Settings > Pages**.
3. Em **Branch**, selecione `main` e a pasta `/ (root)`.
4. Salve e aguarde a publicação em `https://andreweua.github.io/encanto-do-acai/`.

---

Desenvolvido por: **PereiraLabs - Divisão de Tecnologia e IA** | **Louzada & Pereira - Soluções Digitais**.
