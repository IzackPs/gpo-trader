# Crítica de UX e Refatoração (UI/UX + Código)

## Problemas identificados (antes)

### Estrutura e código
- **Tipagem:** Uso de `any` em listagens (ex.: `items: any[]`) e tipos duplicados entre páginas.
- **Modularidade:** Cards e blocos repetidos inline; nenhum componente reutilizável (Button, Card, Badge).
- **Server vs Client:** Uso correto de Server Components no mercado; Create e Navbar como client — adequado, mas Navbar poderia mostrar skeleton em vez de "Carregando...".
- **Semântica:** Falta de `<main>`, `aria-label`, e hierarquia de headings consistente em algumas telas.

### UX e visual
- **Feedback:** Loading apenas com texto "Carregando..." ou spinner; erros via `alert()` (pouco acessível e invasivo).
- **Estados:** Poucos estados de hover/focus explícitos; contraste em alguns textos (ex.: slate-500 em fundo escuro) no limite.
- **Whitespace:** Pouco ritmo vertical; blocos muito colados.
- **Responsividade:** Boa base, mas containers e tipografia sem escala clara (mobile-first).

### Acessibilidade
- **Focus:** Quase nenhum `focus-visible` ou anel de foco consistente.
- **Imagens:** Alguns `alt=""` vazios onde a imagem é decorativa; outros sem alt.
- **Idioma:** `lang="en"` no `<html>` com conteúdo em português.
- **ARIA:** Falta de `role="progressbar"`, `aria-label` em botões só de ícone e em regiões de chat.

---

## Melhorias aplicadas

1. **Design system:** `globals.css` com variáveis (cores, radius, spacing), `lib/utils.ts` com `cn()`, e componentes em `components/ui/` (Button, Card, Badge, Skeleton, Alert, Input, Avatar) com variantes e focus-visible.
2. **Layout:** Navbar no root layout; `PageContainer` e `SectionHeader` para ritmo e largura máxima; `<html lang="pt-BR">`.
3. **Modularidade:** `ListingCard` para o mercado; páginas usando Card, Button, Badge, Alert.
4. **Tipagem:** Uso de tipos em `@/types` (Listing, Item, etc.) nas páginas e componentes.
5. **Feedback:** Skeleton no Navbar ao carregar; grid de skeletons na criação de oferta; Alert para erro e aviso de limite (sem `alert()`).
6. **Acessibilidade:** Focus-visible em links e botões; `aria-label`/`aria-pressed` onde necessário; progress bar com `role="progressbar"` e `aria-valuenow`; chat com `role="log"` e `aria-live="polite"`.
7. **Visual:** Estilo SaaS premium — bordas sutis, hierarquia clara (títulos, descrições), mais espaço entre seções e uso consistente de cores (slate, blue, emerald, amber).
