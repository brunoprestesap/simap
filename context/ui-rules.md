# UI Rules — PATRIMOVE (SIMAP)

Comportamento visual e padrões de UX. Verificar estas regras antes de criar ou modificar qualquer componente de interface.

---

## Layout geral

### Mobile-first
- Estilos base são sempre para mobile (320px+)
- Desktop adiciona comportamento via `md:` e `lg:` prefixes
- Bottom navigation no mobile (≤ `md`), sidebar no desktop (≥ `md`)

### AppLayout
- **Sidebar** (desktop): fundo `bg-primary` (#003366), texto branco, largura fixa ~240px
- **Bottom nav** (mobile): 5 itens max, ícone + label curto, borda superior `border-border`
- **Header** (mobile): logo + NotificationBell + menu hamburger quando necessário
- **Content area**: padding `p-4` no mobile, `p-6` no desktop; max-width `max-w-7xl mx-auto` no desktop

### Páginas
- Título da página: `text-2xl font-bold text-foreground` com separação `mb-6`
- Seções dentro da página separadas por `gap-6`
- Sem fundo diferente por seção — usar apenas `bg-surface` (branco) em cards

---

## Botões

| Variante | Uso | Classes base |
|----------|-----|--------------|
| `primary` | Ação principal da tela | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `secondary` | Ação secundária / confirmar | `bg-secondary text-secondary-foreground hover:bg-secondary/90` |
| `destructive` | Excluir, cancelar irreversível | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `outline` | Cancelar, voltar, ação neutra | `border border-input bg-background hover:bg-accent` |
| `ghost` | Ações em listas/tabelas | `hover:bg-accent hover:text-accent-foreground` |

**Regras:**
- Botão primário: apenas UM por tela (ação mais importante)
- Loading state: sempre mostrar spinner + desabilitar durante `pending`
- Ícone + texto: ícone à esquerda, `gap-2` entre ícone e label
- Mobile: botões full-width (`w-full`) em formulários; fixed-width em tabelas
- Sem bordas arredondadas extremas — usar `rounded-md` (6px) como padrão

---

## Cards

```tsx
// Padrão de card
<div className="bg-surface rounded-lg border border-border p-4 shadow-sm">
  {/* conteúdo */}
</div>

// Card com hover (clicável)
<div className="bg-surface rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
```

**Regras:**
- Sem gradientes em cards
- Header de card: título `text-lg font-semibold` + ação optional à direita em flex `justify-between`
- Divisor interno: `border-t border-border mt-4 pt-4`

---

## Status badges (StatusBadge)

Componente `components/common/StatusBadge.tsx`. Nunca criar badge de status inline — usar o componente.

```tsx
<StatusBadge status="PENDENTE_CONFIRMACAO" />
<StatusBadge status="CONFIRMADA_DESTINO" />
<StatusBadge status="REGISTRADA_SICAM" />
<StatusBadge status="NAO_CONFIRMADA" />
```

Cores via `STATUS_CONFIG` em `lib/constants.ts`:
- Pendente: `bg-jf-warning/15 text-jf-warning`
- Confirmada: `bg-primary/10 text-primary`
- Registrada SICAM: `bg-secondary/10 text-secondary`
- Não confirmada: `bg-destructive/10 text-destructive`

---

## Formulários

- Labels acima dos inputs, `text-sm font-medium text-foreground`
- Inputs: `border border-input rounded-md px-3 py-2 text-sm` com focus ring `ring-ring`
- Erro de validação: `text-sm text-destructive mt-1` abaixo do campo
- Campos obrigatórios: asterisco `*` vermelho após label — não escrever "(obrigatório)"
- Placeholder: texto cinza `text-muted-foreground`, exemplo de preenchimento
- Componente `FormInput` em `components/common/FormInput.tsx` para campos padrão
- Componente `FormError` em `components/common/FormError.tsx` para erros gerais do formulário

---

## Tabelas / listas

- Header de coluna: `text-sm font-medium text-muted-foreground uppercase tracking-wide`
- Linha: `border-b border-border` com `hover:bg-accent/50`
- Sem zebra striping — hover é o único highlight
- Paginação com `Pagination` de `components/common/Pagination.tsx`
- Estado vazio: `EmptyState` de `components/common/EmptyState.tsx` com ícone + mensagem + ação opcional
- Skeleton de loading: `ListSkeleton` de `components/common/ListSkeleton.tsx`

---

## KPI Cards (Dashboard)

```tsx
<KPICard
  title="Total de Movimentações"
  value={142}
  delta={+12}        // positivo = verde, negativo = vermelho
  deltaLabel="vs. mês anterior"
  icon={<ArrowLeftRight className="h-5 w-5" />}
/>
```

- Valor principal: `text-3xl font-semibold`
- Delta positivo: `text-secondary` (verde), negativo: `text-destructive` (vermelho)
- Ícone no canto superior direito com `bg-primary/10 text-primary rounded-full p-2`

---

## Notificações e toasts

- Toast de sucesso: sem variante (padrão branco com borda verde)
- Toast de erro: `variant="destructive"` (fundo vermelho)
- Duração padrão: 4s (não sobrescrever a menos que necessário)
- Posição: top-right no desktop, top-center no mobile

---

## Modais e sheets

- **Sheets** (lateral) para: formulários de edição, detalhes de item, ações contextuais
- **Modais** (central) para: confirmações de ação destrutiva, previews simples
- Sheet width: `w-full sm:max-w-[480px]`
- Sempre incluir botão de fechar (X) e overlay clicável para fechar

---

## Estados de loading

- Página inteira: skeleton via `Suspense` + `ListSkeleton`
- Botão em ação: spinner inline substituindo ícone, botão desabilitado
- Dados em fetch: skeleton de card (não spinner de página)
- Nunca mostrar tela em branco — sempre skeleton ou empty state

---

## Navegação e breadcrumb

- Sem breadcrumb explícito — o título da página contextualiza
- Botão "Voltar" (`outline` ghost) no topo de páginas de detalhe
- Active nav item: fundo levemente mais claro na sidebar, ícone colorido no bottom nav

---

## Ícones

- Biblioteca: **lucide-react** exclusivamente
- Tamanhos: `h-4 w-4` (inline, tabelas), `h-5 w-5` (botões, nav), `h-6 w-6` (highlights, KPIs)
- Sem ícones decorativos sem `aria-hidden="true"`
- Ícones por entidade definidos em `lib/constants.ts`

---

## Regras negativas (o que NÃO fazer)

- Sem gradientes de fundo ou texto
- Sem animações além de `transition-` utilitários do Tailwind
- Sem fonte além de Inter
- Sem cores fora da paleta definida em `ui-tokens.md`
- Sem `shadow-xl` ou maior
- Sem padding/margin em valores hardcoded fora da escala Tailwind
- Sem texto em caps lock para elementos de conteúdo (apenas labels de coluna em tabelas)
- Sem mais de um botão `primary` por área de ação
