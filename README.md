# Encanto do Açaí — Cardápio Digital & Pedidos

Landing page e cardápio digital responsivo desenvolvido para o **Encanto do Açaí**, com foco em conversão direta via WhatsApp e identidade visual tropical de alto contraste.

---

## Stack Técnica

- **Frontend:** HTML5 Semântico, Tailwind CSS (CDN), Font Awesome 6
- **Tipografia:** Google Fonts (`Lilita One`, `Pacifico`, `Montserrat`)
- **Design System:** Documentado em [`guia_de_estilos_encanto_do_a_a.md`](./guia_de_estilos_encanto_do_a_a.md)
- **Integrações:** WhatsApp Direct API (`https://wa.me/5535997147481`)

---

## Estrutura do Projeto

```text
.
├── index.html                         # Página principal (Landing Page & Cardápio)
├── guia_de_estilos_encanto_do_a_a.md  # Guia de estilos e tokens visuais
├── README.md                          # Documentação do projeto
└── CHANGELOG.md                       # Histórico de versões
```

---

## Como Executar Localmente

Por ser uma aplicação estática, basta abrir o arquivo `index.html` diretamente no navegador ou usar um servidor local (como a extensão *Live Server* no VS Code ou Python):

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
