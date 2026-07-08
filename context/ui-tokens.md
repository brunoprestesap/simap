# UI Tokens — PATRIMOVE (SIMAP)

Tokens canônicos do sistema de design. Toda cor, espaçamento e tipografia deve vir daqui. Nunca usar valores hexadecimais literais nos componentes — sempre usar a variável CSS ou a classe Tailwind mapeada.

---

## Cores

### Paleta principal

```css
/* globals.css — :root */

/* Marca JFAP */
--color-primary: #003366;          /* Azul institucional — ações primárias, links */
--color-primary-foreground: #ffffff;

--color-secondary: #2D6E2D;        /* Verde — confirmado, registrado SICAM */
--color-secondary-foreground: #ffffff;

/* Superfícies */
--color-background: #F2F2F2;       /* Fundo geral da aplicação */
--color-surface: #ffffff;          /* Cards, painéis, modais */

/* Texto */
--color-text-primary: #333333;     /* Texto principal */
--color-text-secondary: #666666;   /* Texto secundário, labels */
--color-text-muted: #999999;       /* Placeholders, hints */

/* Status semântico */
--color-destructive: #CC3333;      /* Erro, exclusão, não confirmado */
--color-destructive-foreground: #ffffff;
--color-jf-warning: #D4A017;       /* Pendente, atenção */
--color-jf-warning-foreground: #ffffff;

/* Bordas e divisores */
--color-border: #E2E2E2;
--color-input: #E2E2E2;
--color-ring: #003366;             /* Focus ring = primary */

/* Sidebar */
--color-sidebar: #003366;          /* Fundo da sidebar = primary */
--color-sidebar-foreground: #ffffff;
--color-sidebar-accent: #004080;   /* Hover na sidebar */
```

### Mapeamento Tailwind

| Token CSS | Classe Tailwind | Uso |
|-----------|----------------|-----|
| `--color-primary` | `bg-primary`, `text-primary` | Botões primários, links, header |
| `--color-secondary` | `bg-secondary`, `text-secondary` | Status REGISTRADA_SICAM |
| `--color-background` | `bg-background` | Fundo da página |
| `--color-surface` | `bg-surface` | Cards, sheets |
| `--color-destructive` | `bg-destructive`, `text-destructive` | Erros, ações destrutivas |
| `--color-jf-warning` | `bg-jf-warning`, `text-jf-warning` | Status PENDENTE_CONFIRMACAO |
| `--color-border` | `border-border` | Bordas de cards e inputs |
| `--color-text-primary` | `text-foreground` | Texto principal |
| `--color-text-secondary` | `text-muted-foreground` | Labels, texto secundário |

---

## Status badges (cores por estado de movimentação)

```typescript
// lib/constants.ts — STATUS_CONFIG
PENDENTE_CONFIRMACAO: "bg-jf-warning/15 text-jf-warning"    // Amarelo
CONFIRMADA_DESTINO:   "bg-primary/10 text-primary"          // Azul
REGISTRADA_SICAM:     "bg-secondary/10 text-secondary"      // Verde
NAO_CONFIRMADA:       "bg-destructive/10 text-destructive"  // Vermelho
```

---

## Tipografia

```css
/* Font */
--font-sans: "Inter", system-ui, sans-serif;   /* Única fonte do projeto */

/* Escala tipográfica (via Tailwind) */
/* text-xs    → 12px / line-height 16px  — badges, labels menores */
/* text-sm    → 14px / line-height 20px  — texto de tabela, metadados */
/* text-base  → 16px / line-height 24px  — corpo de texto padrão */
/* text-lg    → 18px / line-height 28px  — subtítulos de seção */
/* text-xl    → 20px / line-height 28px  — títulos de card */
/* text-2xl   → 24px / line-height 32px  — títulos de página */
/* text-3xl   → 30px / line-height 36px  — KPI numbers no dashboard */
```

**Pesos:**
- `font-normal` (400) — corpo de texto
- `font-medium` (500) — labels de formulário, itens de nav
- `font-semibold` (600) — títulos de card, valores de KPI
- `font-bold` (700) — títulos de página H1

**Regra:** Sem gradientes de texto. Sem outros font-families além de Inter.

---

## Espaçamentos

O projeto usa a escala padrão do Tailwind 4 (rem base 4px):

| Token | Valor | Uso típico |
|-------|-------|-----------|
| `p-1` | 4px | Padding interno de badge |
| `p-2` | 8px | Padding de botão compacto |
| `p-3` | 12px | Gap interno de item de lista |
| `p-4` | 16px | Padding padrão de card |
| `p-6` | 24px | Padding de página |
| `p-8` | 32px | Padding de modal/sheet |
| `gap-2` | 8px | Gap entre ícone e label |
| `gap-4` | 16px | Gap entre campos de formulário |
| `gap-6` | 24px | Gap entre seções de página |

---

## Border radius

```css
--radius: 0.5rem;   /* 8px — padrão de cards e inputs */
/* Derivados via Tailwind: */
/* rounded-sm   → calc(var(--radius) - 4px) = 4px */
/* rounded-md   → calc(var(--radius) - 2px) = 6px */
/* rounded-lg   → var(--radius) = 8px */
/* rounded-xl   → calc(var(--radius) + 4px) = 12px */
/* rounded-full → 9999px — badges, avatares */
```

---

## Sombras

```css
/* Tailwind padrão, uso específico: */
/* shadow-sm   — cards inativos */
/* shadow-md   — cards com hover, dropdowns */
/* shadow-lg   — modais, sheets */
/* Sem shadow-xl ou shadow-2xl no projeto */
```

---

## Breakpoints (Tailwind padrão)

| Prefixo | Min-width | Contexto |
|---------|----------|---------|
| (none) | 0px | Mobile — layout principal, bottom nav |
| `sm:` | 640px | Tablet pequeno |
| `md:` | 768px | Tablet — transição sidebar/bottom nav |
| `lg:` | 1024px | Desktop — sidebar visível |
| `xl:` | 1280px | Desktop largo |

**Regra mobile-first:** escrever estilos base para mobile, adicionar prefixo para desktop.
