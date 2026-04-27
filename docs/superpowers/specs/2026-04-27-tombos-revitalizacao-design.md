# Revitalização da página /tombos

**Data:** 2026-04-27
**Escopo:** Revitalização visual e responsividade mobile da lista de tombos + criação da página de detalhe `/tombos/[id]`
**Perfis afetados:** `TECNICO_TI`, `SERVIDOR_SEMAP`

---

## Contexto

A página `/tombos` exibe a lista de tombos patrimoniais da JFAP para consulta e gerenciamento. Atualmente os cards mobile são funcionais mas sem hierarquia visual clara, o campo de busca fica estreito em telas pequenas, e não existe página de detalhe — tombos não são navegáveis.

O objetivo é tornar a lista mais legível e tapeável no mobile, corrigir o layout do toolbar em telas pequenas, e criar a página de detalhe com as informações completas do bem e acesso à ação de iniciar movimentação.

---

## Decisões de design

| Componente | Decisão |
|---|---|
| Card mobile na lista | Rich card (B): número + badge, descrição, metadados, "Ver detalhes ›" |
| Toolbar mobile | Search full-width flex-1 + botão Filtros à direita |
| Filtros avançados | Painel inline colapsável (mantido, refinado) |
| Detalhe: estrutura | Hero card azul + seções brancas + CTA fixo no rodapé |
| Detalhe: CTA | "Iniciar Movimentação" visível apenas para `TECNICO_TI` |

---

## 1. Lista `/tombos` — alterações

### 1.1 Toolbar

**Antes:** `flex justify-between` com botão Filtros à esquerda e search `w-48 sm:w-64` à direita — cramped em telas < 375px.

**Depois:**
```
[🔍 Buscar por nº ou descrição…    ] [⚙ Filtros 1]  [Limpar]
```
- Search: `<input>` com `flex-1 min-w-0` dentro de wrapper `flex gap-2`
- Botão Filtros: `shrink-0`, badge numérico conta filtros ativos (unidade e/ou setor)
- Botão Limpar: aparece quando `hasFilters || busca || status !== 'todos'`

### 1.2 Chips de status

Sem mudança funcional. Garantir `flex-nowrap overflow-x-auto` com `scrollbar-hide` para não quebrar linha em telas pequenas. Chips são `shrink-0`.

### 1.3 Painel de filtros inline

Sem mudança funcional. Pequenas melhorias:
- Label de Setor mostra "(selecione uma unidade)" quando desabilitado
- Animação de abertura/fechamento com `transition-all`

### 1.4 Cards mobile (nova implementação)

Cada card é um `<Link href={`/tombos/${tombo.id}`}>` com:

```
┌─────────────────────────────────────────────┐
│  # 0034521                    [Ativo]        │
│  Notebook Dell Latitude 5520 i7 16GB 512GB   │
│  ─────────────────────────────────────────── │
│  🏢 GAB · 📂 Secretaria · 👤 João Silva      │
│                               Ver detalhes › │
└─────────────────────────────────────────────┘
```

Classes relevantes:
- Container: `rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all`
- Número: `font-mono font-bold text-sm text-primary`
- Descrição: `text-sm text-foreground line-clamp-2 mt-1`
- Metadados: `flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-border`
- Rodapé: `flex justify-end mt-1 text-xs font-semibold text-primary`
- Feedback toque: `transition-transform active:scale-[0.99]`

### 1.5 Tabela desktop

Mantida. Linhas ganham `cursor-pointer` e navegam via `onClick={() => router.push(\`/tombos/${tombo.id}\`)}` — `TombosList` já é Client Component, então `useRouter` está disponível sem custo adicional. `<tr>` não pode envolver `<Link>` (HTML inválido).

---

## 2. Página de detalhe `/tombos/[id]` — nova

### 2.1 Rota

`app/(dashboard)/tombos/[id]/page.tsx` — Server Component com `requireRole(["TECNICO_TI", "SERVIDOR_SEMAP"])`.

Recebe `params.id` (cuid do tombo). Chama `buscarTomboDetalhe(id)` — nova query. Redireciona para `/tombos` com `notFound()` se o tombo não existir.

### 2.2 Query: `buscarTomboDetalhe`

**Arquivo:** `server/queries/tombo.ts`

```ts
async function buscarTomboDetalhe(id: string): Promise<TomboDetalhe | null>
```

Retorna:
```ts
{
  id, numero, descricaoMaterial,
  codigoFornecedor, nomeFornecedor,
  ativo,
  unidade: { id, codigo, descricao } | null,
  setor: { id, codigo, nome } | null,
  usuarioResponsavel: { id, nome, matricula } | null,
  matriculaResponsavel, nomeResponsavel,
  createdAt, updatedAt,
  movimentacoes: Array<{
    id,
    status,
    createdAt,
    unidadeOrigem: { codigo, descricao },
    unidadeDestino: { codigo, descricao },
    tecnico: { nome },
  }>  // movimentações ordenadas por createdAt desc, limit 10
}
```

As movimentações vêm via `itensMovimentacao` → `movimentacao` com os campos necessários para a timeline.

### 2.3 Layout da página de detalhe

```
‹ Tombos                                        [página]

┌─ Hero card (bg #003366) ──────────────────────┐
│  0034521                          [Ativo]      │
│  Notebook Dell Latitude 5520 i7               │
│  16GB RAM 512GB SSD                           │
└───────────────────────────────────────────────┘

┌─ Localização ─────────────────────────────────┐
│  Unidade      GAB — Gabinete do Juiz           │
│  Setor        Secretaria                       │
└───────────────────────────────────────────────┘

┌─ Responsável ─────────────────────────────────┐
│  Nome         João Silva                       │
│  Matrícula    001234                           │
└───────────────────────────────────────────────┘

┌─ Fornecedor ──────────────────────────────────┐  (apenas se preenchido)
│  Nome         Dell Computadores do Brasil      │
│  Código       DL-5520-I7                       │
└───────────────────────────────────────────────┘

┌─ Histórico de Movimentações ──────────────────┐
│  ● Registrada no SICAM        15 abr 2025      │
│    TI → GAB                                    │
│  ● Confirmada na origem       10 abr 2025      │
│    Maria Souza                                 │
│  ● Movimentação registrada    08 abr 2025      │
│    Carlos TI                                   │
└───────────────────────────────────────────────┘

[═══════════ + Iniciar Movimentação ════════════]  ← sticky bottom, só TECNICO_TI
```

### 2.4 Hero card

- Background: `bg-primary` (`#003366`)
- Número: `font-mono text-2xl font-extrabold text-white`
- Badge de status: `bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full`
- Descrição: `text-white/80 text-sm mt-2 leading-relaxed`
- Padding: `p-5 rounded-2xl`

### 2.5 Seções de informação

Componente `InfoSection` reutilizável:
```tsx
<InfoSection titulo="Localização">
  <InfoRow label="Unidade" value="GAB — Gabinete do Juiz" />
  <InfoRow label="Setor" value="Secretaria" />
</InfoSection>
```

- Container: `rounded-xl border border-border bg-card`
- Título da seção: `text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 pt-3 pb-2`
- Linha: `flex justify-between items-start px-4 py-2.5 border-t border-border first:border-0`
- Label: `text-sm text-muted-foreground shrink-0`
- Value: `text-sm font-medium text-foreground text-right`

Seção Fornecedor: omitida completamente se `!nomeFornecedor && !codigoFornecedor`.

### 2.6 Timeline de histórico

- Seção "Histórico de Movimentações" — omitida se não houver movimentações
- Cada item: dot colorido pelo status + título + data + rota (origem → destino)
- Cores dos dots mapeadas pelo status da movimentação (PENDENTE_CONFIRMACAO → warning, CONFIRMADA_ORIGEM → primary, REGISTRADA_SICAM → green, CANCELADA → destructive)
- Máximo 10 movimentações exibidas (mais antigas truncadas)

### 2.7 CTA "Iniciar Movimentação"

- Visível apenas se `session.user.perfil === 'TECNICO_TI'`
- Renderizado no Server Component via `getServerSession` / `auth()`
- Link: `href="/movimentacao/nova"` (wizard existente)
- Container: `sticky bottom-0 bg-background border-t border-border p-4` com padding extra para safe-area iOS via `style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}`
- Botão: `w-full bg-primary text-white rounded-xl py-3 font-bold text-sm`

---

## 3. Escopo fora deste trabalho

- Pré-preenchimento do número de tombo no wizard de movimentação (requereria mudança no `MovimentacaoForm`)
- Edição de dados do tombo (CRUD de tombos — Onda 2)
- Inativação/ativação de tombos pela interface

---

## 4. Arquivos afetados

| Arquivo | Ação |
|---|---|
| `components/views/TombosList.tsx` | Atualizar toolbar + cards mobile |
| `server/queries/tombo.ts` | Adicionar `buscarTomboDetalhe` |
| `app/(dashboard)/tombos/[id]/page.tsx` | Criar (novo, Server Component) |

Componentes auxiliares — todos inline em `page.tsx` já que não há interatividade:
- `InfoSection` / `InfoRow` — componentes server inline
- `TomboHeroCard` — componente server inline
- `MovimentacaoTimeline` — componente server inline

`TomboDetalhe.tsx` separado não é necessário — a página não tem estado client-side no escopo atual.
