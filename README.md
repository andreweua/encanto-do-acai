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
├── admin.html                           # Painel administrativo para editar e enviar estoque à planilha
├── apps-script/
│   └── Code.gs                          # Script do Google Sheets para leitura/escrita com PIN
├── assets/
│   ├── favicon.svg                      # Ícone da marca para navegador
│   └── encanto-hero.jpg                 # Imagem do Hero e prévia Open Graph
├── js/
│   ├── config.js                        # Configurações, URL do Apps Script/planilha e catálogo padrão
│   ├── estoque.js                       # Leitura CSV/JSON do Google Sheets e regras de estoque
│   ├── app.js                           # Montador interativo, sacola e envio em cupom no WhatsApp
│   └── admin.js                         # Lógica do painel administrativo
├── modelo_estoque_google_sheets.csv     # Planilha modelo opcional para importação manual
├── guia_de_estilos_encanto_do_a_a.md    # Guia de estilos e tokens visuais
├── README.md                            # Documentação do projeto
└── CHANGELOG.md                         # Histórico de versões
```

---

## Como Conectar o Estoque no Google Sheets

### Forma recomendada: Painel `admin.html` + Apps Script (sem importar CSV)

1. Crie uma planilha em branco no [Google Sheets](https://sheets.google.com).
2. No menu da planilha, acesse **Extensões > Apps Script** e cole o código de [`apps-script/Code.gs`](./apps-script/Code.gs).
3. Altere `ADMIN_PIN` na primeira linha de código para sua senha secreta.
4. Clique em **Implantar > Nova implantação > App da Web** (Executar como: *Eu*; Quem pode acessar: *Qualquer pessoa*) e copie a URL gerada.
5. Cole a URL em `APPS_SCRIPT_URL` no arquivo [`js/config.js`](./js/config.js) (ou diretamente na tela de [`admin.html`](./admin.html)) e clique em **Enviar para Planilha**. A planilha será preenchida automaticamente com cabeçalho e todos os itens.

### Alternativa (somente leitura via CSV)

Se preferir editar manualmente na planilha sem usar o painel `admin.html`, importe [`modelo_estoque_google_sheets.csv`](./modelo_estoque_google_sheets.csv), compartilhe como **Qualquer pessoa com o link (Leitor)** e cole o ID em `GOOGLE_SHEET_ID` no [`js/config.js`](./js/config.js).

### Como funciona o status **Indisponível** na planilha

| Coluna | Regra |
| :--- | :--- |
| `estoque` | Para a linha `acai` (`acai-litros`), representa os **Litros de Açaí** (aceita decimais como `2.5` ou `2,5`) que determinam quantos copos de `200 ml` a `700 ml` podem ser montados; nos copos, representa embalagens físicas; nos adicionais, unidades disponíveis. (`0` ou `NÃO` deixa **Indisponível**). |
| `ativo` | `SIM` mantém visível para venda; `NÃO` pausa o item como **Indisponível** mesmo com saldo |
| `preco` | Aceita `10.00`, `10,00` ou `R$ 10,00` |
| `categoria` | `acai`, `copo`, `adicional_gratis` ou `adicional_pago` |

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
