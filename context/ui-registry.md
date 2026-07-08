# UI Registry — PATRIMOVE (SIMAP)

Catálogo vivo de padrões de componentes. Preenchido automaticamente conforme novos componentes são criados ou padrões são consolidados.

**Regra:** antes de criar qualquer novo componente UI, verificar se existe um padrão aqui. Se existe — reusar as classes exatas. Se não existe — criar seguindo `ui-tokens.md` + `ui-rules.md` e registrar aqui.

---

## Como usar este arquivo

1. **Antes de criar** um botão, card, badge ou qualquer elemento — buscar neste arquivo
2. Se encontrar um padrão correspondente — copiar as classes exatas (não reinventar)
3. Se criar algo novo que outros vão reusar — adicionar uma entrada aqui com o padrão

---

## Componentes disponíveis

### StatusBadge
**Arquivo:** `components/common/StatusBadge.tsx`
**Uso:**
```tsx
<StatusBadge status={movimentacao.status} />
```
Aceita `StatusMovimentacao`. Cores automáticas via `STATUS_CONFIG`.

---

### KPICard
**Arquivo:** `components/common/KPICard.tsx`
**Uso:**
```tsx
<KPICard title="..." value={n} delta={+5} deltaLabel="vs. mês anterior" icon={<Icon />} />
```

---

### EmptyState
**Arquivo:** `components/common/EmptyState.tsx`
**Uso:**
```tsx
<EmptyState
  icon={<Package className="h-12 w-12" />}
  title="Nenhum tombo encontrado"
  description="Ajuste os filtros ou realize uma nova busca."
  action={<Button>Nova Movimentação</Button>}
/>
```

---

### Pagination
**Arquivo:** `components/common/Pagination.tsx`
**Uso:**
```tsx
<Pagination total={total} page={page} pageSize={20} />
```
Gera query param `?page=N` via link, sem estado client-side.

---

### ListSkeleton
**Arquivo:** `components/common/ListSkeleton.tsx`
**Uso:** dentro de `<Suspense fallback={<ListSkeleton />}>` em páginas com listagens.

---

### Scanner
**Arquivo:** `components/common/Scanner.tsx`
**Uso:**
```tsx
'use client'
<Scanner onScan={(code) => handleScan(code)} onError={(err) => console.error(err)} />
```
Sempre `'use client'`. Encapsula html5-qrcode.

---

### FormInput
**Arquivo:** `components/common/FormInput.tsx`
**Uso:**
```tsx
<FormInput label="Número do Tombo" name="numero" required placeholder="ex: 123456" />
```

---

### FormError
**Arquivo:** `components/common/FormError.tsx`
**Uso:**
```tsx
{error && <FormError message={error} />}
```

---

### MultiSelect
**Arquivo:** `components/common/MultiSelect.tsx`
**Uso:** seleção múltipla de tombos com busca embutida.

---

### MovimentacaoTimeline
**Arquivo:** `components/common/MovimentacaoTimeline.tsx`
**Uso:**
```tsx
<MovimentacaoTimeline movimentacao={mov} />
```
Renderiza os steps `PENDENTE → CONFIRMADA → REGISTRADA` com datas.

---

## Padrões de classes (snippets reutilizáveis)

### Card padrão
```html
<div class="bg-surface rounded-lg border border-border p-4 shadow-sm">
```

### Card clicável
```html
<div class="bg-surface rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
```

### Header de seção
```html
<div class="flex items-center justify-between mb-4">
  <h2 class="text-lg font-semibold text-foreground">Título</h2>
  <Button variant="outline" size="sm">Ação</Button>
</div>
```

### Linha de metadado (label + valor)
```html
<div class="flex items-center gap-2 text-sm">
  <span class="text-muted-foreground">Label:</span>
  <span class="text-foreground font-medium">Valor</span>
</div>
```

### Badge genérico (sem status semântico)
```html
<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
  Texto
</span>
```

### Página com título e conteúdo
```html
<div class="p-4 md:p-6 max-w-7xl mx-auto">
  <h1 class="text-2xl font-bold text-foreground mb-6">Título da Página</h1>
  <!-- conteúdo -->
</div>
```

### Tabela padrão
```html
<div class="rounded-lg border border-border overflow-hidden">
  <table class="w-full text-sm">
    <thead class="bg-muted/50">
      <tr>
        <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Coluna
        </th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-t border-border hover:bg-accent/50 transition-colors">
        <td class="px-4 py-3 text-foreground">valor</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Grid de KPIs
```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
  <!-- KPICard × 4 -->
</div>
```

---

*Última atualização: 2026-07-07. Adicionar novos padrões neste arquivo ao criar componentes reutilizáveis.*
