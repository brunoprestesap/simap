# SIMAP — Design System

## Direction & Feel

Institutional, operational, functional. This is a federal judiciary tool — not a consumer app. Clean, no-nonsense, paper-like surfaces. The visual language says "government system that actually works well."

**Who uses this:** TI technicians scanning barcodes and registering movements, SEMAP operators processing backlogs, responsible servers confirming patrimony, managers checking KPIs. All during work hours, on desktops or mobile devices in office/warehouse settings.

**Feel:** Calm authority. Dense enough to be productive, spacious enough to not overwhelm. No gradients, no decorative elements. Color means something — never decoration.

## Palette (Institutional JF)

All colors are defined in `app/globals.css` as CSS custom properties.

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` / `jf-blue` | `#003366` | Primary actions, sidebar, focus rings, active chips |
| `--secondary` / `jf-green` | `#2D6E2D` | Success/confirmed states, "Ativo", "Registrada SICAM" |
| `--jf-warning` | `#D4A017` | Pending states, "Em movimentação", attention |
| `--destructive` / `jf-error` | `#CC3333` | Error, "Inativo", "Não Confirmada" |
| `--foreground` | `#333333` | Primary text |
| `--muted-foreground` | `#666666` | Secondary/supporting text |
| `--background` | `#F2F2F2` | Page canvas |
| `--card` | `#FFFFFF` | Card/surface |
| `--border` | `#E0E0E0` | Borders |
| `--accent` | `#E8EDF2` | Hover states, inactive chip background |

**Rule:** Never use raw Tailwind color classes (`bg-red-100`, `bg-green-500`, etc.). Always use institutional tokens.

## Depth Strategy

**Borders-only.** No shadows on table rows or inline elements. Cards use `border border-border` with optional `shadow-sm` only on mobile cards. Sidebar uses `border-r` for separation, same philosophy. Higher elevation surfaces (dropdowns, modals) may use subtle shadow.

## Spacing

Base unit: 4px (Tailwind default). Consistent scale via Tailwind spacing utilities.

- Micro (icon gaps): `gap-2` (8px)
- Component internal: `p-4` (16px) for cards, `px-3 py-1` for chips
- Section spacing: `space-y-4` (16px) between groups
- Major separation: `space-y-6` (24px) between page sections

## Typography

- **Sans:** Inter (`--font-inter`), fallback Century Gothic/Calibri
- **Mono:** Geist Mono (`--font-geist-mono`) — used for tombo numbers, codes, IDs
- **Heading:** `text-lg font-semibold text-foreground`
- **Subtitle:** `text-sm text-muted-foreground`
- **Body:** `text-sm text-foreground`
- **Labels:** `text-xs font-medium text-muted-foreground`
- **Data identifiers:** `font-mono font-medium` (or `font-semibold` for emphasis)

## Border Radius

- Inputs/buttons: `rounded-md` (0.4rem)
- Cards: `rounded-lg` (0.5rem)
- Badges/chips: `rounded-full`
- Base `--radius`: `0.5rem`

## Status Badges

All status badges follow this exact pattern:

```
className="inline-flex items-center rounded-full bg-{token}/10 px-2.5 py-0.5 text-xs font-semibold text-{token}"
```

Some use `/15` for slightly more contrast (e.g., warning states).

| State | Classes |
|-------|---------|
| Ativo / Presente / Registrada SICAM | `bg-secondary/10 text-secondary` |
| Pendente / Em movimentação | `bg-jf-warning/15 text-jf-warning` |
| Confirmada | `bg-primary/10 text-primary` |
| Inativo / Erro / Não Confirmada | `bg-destructive/10 text-destructive` |

## Filter Chips

Active: `bg-primary text-white rounded-full px-3 py-1 text-xs font-medium`
Inactive: `bg-muted text-muted-foreground hover:bg-accent rounded-full px-3 py-1 text-xs font-medium`

## Search Input

```
className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
```

With `Search` icon absolutely positioned at `left-3 top-1/2 -translate-y-1/2`.

## Select/Dropdown (native)

```
className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
```

Disabled: add `disabled:opacity-50`.

## Filter Panel (Collapsible)

```
className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
```

Toggle button with active indicator badge (`!` in `bg-primary` circle).

## Responsive Pattern

- **Mobile:** Card-based layout (`md:hidden`), `space-y-3`
- **Desktop:** Table layout (`hidden md:block`), `overflow-x-auto`
- Cards: `rounded-lg border border-border bg-card p-4 shadow-sm`
- Table rows: `border-b border-border last:border-0 hover:bg-muted/50`
- Table headers: `pb-2 pr-4 font-medium text-muted-foreground`

## Pagination

- Desktop: `hidden md:flex` — Previous/Next icon buttons + "Página X de Y"
- Mobile: `flex md:hidden` — "Carregar mais" outline button

## Loading Skeleton

```jsx
{[1, 2, 3].map((i) => (
  <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
))}
```

## Empty State

Use `<EmptyState>` component from `components/common/EmptyState.tsx`:
- Props: `titulo`, `mensagem`, `ctaLabel?`, `ctaHref?`

## Page Structure

Server component page → Client view component:
- Page: auth guard + header (`h2` title + `p` subtitle) + `<ViewComponent />`
- View: `"use client"`, URL-based filters via `useSearchParams`, `useTransition` for loading
