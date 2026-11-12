# 🎨 Guia de Estilos (Design System) - Encanto do Açaí

Este documento contém as diretrizes de identidade visual extraídas do cardápio digital do "Encanto do Açaí", prontas para serem aplicadas em websites, aplicativos (PWAs) e materiais gráficos.

---

## 1. Paleta de Cores

As cores foram mapeadas para manter a vibração tropical, o forte contraste para leitura noturna/mobile e o apetite visual (appetite appeal).

| Cor | Uso Principal | HEX | RGB |
| :--- | :--- | :--- | :--- |
| **Roxo Açaí (Dark)** | Fundos, base de seções e contraste principal. | `#380B4E` | `rgb(56, 11, 78)` |
| **Rosa Vibrante** | Destaques de preços, tags, botões primários (CTAs) e título. | `#E3005A` | `rgb(227, 0, 90)` |
| **Amarelo Ouro** | Assinatura (Logo), elementos de aviso e botões secundários. | `#FFC107` | `rgb(255, 193, 7)` |
| **Ciano / Acqua** | Detalhes refrescantes, ícones e subtítulos (Adicionais Grátis). | `#00BFA5` | `rgb(0, 191, 165)` |
| **Branco Puro** | Textos de corpo, tabelas nutricionais e contatos. | `#FFFFFF` | `rgb(255, 255, 255)` |

---

## 2. Tipografia (Fontes)

A hierarquia de textos utiliza três famílias distintas do Google Fonts para separar a marca, a emoção e a leitura técnica de preços.

*   **Títulos Principais (Display):** `Lilita One` ou `Fredoka One`
    *   *Uso:* Títulos grandes (Ex: "ENCANTO", "COPOS DE AÇAÍ"). Traz robustez e formato amigável/arredondado.
*   **Assinatura / Decorativa (Script):** `Pacifico` ou `Kaushan Script`
    *   *Uso:* Palavra "Açaí" e pequenos detalhes charmosos. Traz o aspecto artesanal e humano.
*   **Textos de Corpo e Preços (Sans-Serif):** `Montserrat` ou `Inter`
    *   *Uso:* Listas de adicionais, preços (R$), telefone e rodapé. Essencial para máxima legibilidade em telas pequenas.

---

## 3. Elementos de Interface (UI)

*   **Bordas (Border-Radius):** Uso intenso de bordas muito arredondadas (`rounded-2xl` ou `rounded-full`) nas caixas de preços e botões.
*   **Sombras (Shadows):** Sombras coloridas (Glow) atrás dos textos principais, simulando letreiros neon.
*   **Botão Flutuante (WhatsApp):** O botão de pedido deve usar a cor verde padrão do WhatsApp (`#25D366`) para conversão imediata, contrastando com o fundo roxo.

---

## 4. Códigos Prontos para Desenvolvimento

### Opção A: Variáveis CSS Puras (Vanilla CSS)
Copie e cole no seu arquivo `.css` global:

```css
:root {
  /* Paleta de Cores - Encanto do Açaí */
  --color-acai-dark: #380B4E;
  --color-acai-magenta: #E3005A;
  --color-acai-yellow: #FFC107;
  --color-acai-cyan: #00BFA5;
  --color-text-light: #FFFFFF;

  /* Tipografia */
  --font-display: 'Lilita One', 'Fredoka One', cursive;
  --font-script: 'Pacifico', 'Kaushan Script', cursive;
  --font-body: 'Montserrat', 'Inter', sans-serif;
}
```

### Opção B: Configuração para Tailwind CSS
Adicione as cores e fontes ao seu `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        acai: {
          dark: '#380B4E',
          magenta: '#E3005A',
          yellow: '#FFC107',
          cyan: '#00BFA5',
        }
      },
      fontFamily: {
        display: ['"Lilita One"', '"Fredoka One"', 'cursive'],
        script: ['"Pacifico"', 'cursive'],
        sans: ['"Montserrat"', '"Inter"', 'sans-serif'],
      }
    }
  }
}
```