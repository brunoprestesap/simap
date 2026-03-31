---
paths:
  - "components/**"
  - "app/**"
---

# Regras para Componentes React

- Server Components são o default. Use `'use client'` SOMENTE quando há interatividade (useState, useEffect, event handlers, browser APIs).
- Componentes client que usam apenas hooks devem ser wrappers finos em torno de Server Components.
- Props: sempre defina interface TypeScript. Use `import type` para importar tipos.
- Nunca use `any`. Use `unknown` se necessário e faça type narrowing.
- Acessibilidade: todo ícone interativo deve ter `aria-label`. Botões nunca devem ser divs. Use elementos semânticos.
- Responsividade mobile-first: comece pelos estilos mobile, use `md:` e `lg:` para tablet/desktop.
- Navegação interna: sempre use `<Link>` do Next.js, nunca `<a>` com href relativo.
- Imagens: use `next/image` para otimização automática.
- Loading states: use Skeleton do shadcn/ui com shimmer. Nunca deixe tela em branco durante carregamento.
- Empty states: use o componente EmptyState com ilustração SVG + mensagem amigável.
