# Revitalização da página /tombos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revitalizar a lista `/tombos` com cards mobile ricos e tapeáveis, corrigir o toolbar em telas pequenas, e criar a página de detalhe `/tombos/[id]` com hero card, seções de informação, histórico de movimentações e CTA para iniciar movimentação.

**Architecture:** A lista existente (`TombosList.tsx`) recebe ajustes de layout — toolbar full-width, cards mobile viram Links com hierarquia visual clara, linhas desktop ganham navegação via `useRouter`. A página de detalhe é um novo Server Component em `app/(dashboard)/tombos/[id]/page.tsx` com componentes auxiliares inline. Uma nova query `buscarTomboDetalhe` é adicionada a `server/queries/tombo.ts`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (findUnique com include aninhado), Tailwind CSS v4, lucide-react, `next/link`, `next/navigation`.

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `server/queries/tombo.ts` | Adicionar `buscarTomboDetalhe` e exportar tipo `TomboDetalhe` |
| `server/queries/__tests__/tombo.test.ts` | Adicionar describe block para `buscarTomboDetalhe` |
| `app/(dashboard)/tombos/[id]/page.tsx` | Criar — Server Component com sub-componentes inline |
| `components/views/TombosList.tsx` | Atualizar toolbar, chips, cards mobile, linhas desktop |

---

## Task 1: Query `buscarTomboDetalhe` com testes (TDD)

**Files:**
- Modify: `server/queries/tombo.ts`
- Modify: `server/queries/__tests__/tombo.test.ts`

- [ ] **Step 1: Escrever os testes com falha**

Adicione ao final de `server/queries/__tests__/tombo.test.ts` (após o describe de `buscarTomboParaMovimentacao`):

```typescript
describe("buscarTomboDetalhe", () => {
  const mockTomboDetalhe = {
    id: "t1",
    numero: "0034521",
    descricaoMaterial: "Notebook Dell Latitude 5520",
    codigoFornecedor: "DL-001",
    nomeFornecedor: "Dell Computadores do Brasil",
    ativo: true,
    matriculaResponsavel: null as string | null,
    nomeResponsavel: null as string | null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-04-27"),
    unidade: { id: "u1", codigo: "GAB", descricao: "Gabinete do Juiz" },
    setor: { id: "s1", codigo: "SEC", nome: "Secretaria" },
    usuarioResponsavel: { id: "usr1", nome: "João Silva", matricula: "001234" },
    itensMovimentacao: [
      {
        id: "im1",
        movimentacaoId: "m1",
        tomboId: "t1",
        createdAt: new Date("2025-04-15"),
        movimentacao: {
          id: "m1",
          status: "REGISTRADA_SICAM" as const,
          createdAt: new Date("2025-04-15"),
          unidadeOrigem: { codigo: "TI", descricao: "Setor de TI" },
          unidadeDestino: { codigo: "GAB", descricao: "Gabinete do Juiz" },
          tecnico: { nome: "Carlos TI" },
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null quando o tombo não existe", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(null);

    const result = await buscarTomboDetalhe("nao-existe");

    expect(result).toBeNull();
    expect(prisma.tombo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "nao-existe" } }),
    );
  });

  it("retorna tombo com dados completos incluindo movimentações", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(
      mockTomboDetalhe as unknown as Awaited<
        ReturnType<typeof prisma.tombo.findUnique>
      >,
    );

    const result = await buscarTomboDetalhe("t1");

    expect(result).not.toBeNull();
    expect(result?.numero).toBe("0034521");
    expect(result?.itensMovimentacao).toHaveLength(1);
    expect(result?.itensMovimentacao[0].movimentacao.status).toBe(
      "REGISTRADA_SICAM",
    );
  });

  it("chama findUnique com include de movimentações limitado a 10 e ordenado desc", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(null);

    await buscarTomboDetalhe("t1");

    expect(prisma.tombo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        include: expect.objectContaining({
          itensMovimentacao: expect.objectContaining({
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        }),
      }),
    );
  });
});
```

Adicione também `buscarTomboDetalhe` aos imports do arquivo de teste (linha 4):

```typescript
import { buscarTomboDetalhe, buscarTomboParaMovimentacao, listarTombos } from "../tombo";
```

- [ ] **Step 2: Rodar os testes para confirmar falha**

```bash
npx vitest run server/queries/__tests__/tombo.test.ts
```

Saída esperada: FAIL — `buscarTomboDetalhe is not a function` (ou similar).

- [ ] **Step 3: Implementar a query em `server/queries/tombo.ts`**

Adicione ao final do arquivo, antes do último `}` (o arquivo não tem um objeto final — adicione após `buscarTomboParaMovimentacao`):

```typescript
export async function buscarTomboDetalhe(id: string) {
  return prisma.tombo.findUnique({
    where: { id },
    include: {
      unidade: { select: { id: true, codigo: true, descricao: true } },
      setor: { select: { id: true, codigo: true, nome: true } },
      usuarioResponsavel: { select: { id: true, nome: true, matricula: true } },
      itensMovimentacao: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          movimentacao: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              unidadeOrigem: { select: { codigo: true, descricao: true } },
              unidadeDestino: { select: { codigo: true, descricao: true } },
              tecnico: { select: { nome: true } },
            },
          },
        },
      },
    },
  });
}

export type TomboDetalhe = NonNullable<
  Awaited<ReturnType<typeof buscarTomboDetalhe>>
>;
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
npx vitest run server/queries/__tests__/tombo.test.ts
```

Saída esperada: PASS — todos os testes de `buscarTomboDetalhe`, `buscarTomboParaMovimentacao` e `listarTombos` passando.

- [ ] **Step 5: Commit**

```bash
git add server/queries/tombo.ts server/queries/__tests__/tombo.test.ts
git commit -m "feat(tombos): adicionar query buscarTomboDetalhe com tipo TomboDetalhe"
```

---

## Task 2: Criar página de detalhe `/tombos/[id]/page.tsx`

**Files:**
- Create: `app/(dashboard)/tombos/[id]/page.tsx`

- [ ] **Step 1: Criar o diretório e o arquivo**

```bash
mkdir -p app/\(dashboard\)/tombos/\[id\]
```

- [ ] **Step 2: Escrever o arquivo `app/(dashboard)/tombos/[id]/page.tsx`**

Conteúdo completo:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { buscarTomboDetalhe } from "@/server/queries/tombo";
import type { TomboDetalhe } from "@/server/queries/tombo";
import { nomeResponsavelExibicao } from "@/lib/tombo-responsavel";
import { formatDateBR } from "@/lib/format";
import { MOVIMENTACAO_STATUS_EM_ANDAMENTO } from "@/lib/movimentacao-status";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_CONFIRMACAO: "Movimentação registrada",
  CONFIRMADA_ORIGEM: "Confirmada na origem",
  REGISTRADA_SICAM: "Registrada no SICAM",
  NAO_CONFIRMADA: "Não confirmada",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  PENDENTE_CONFIRMACAO: "bg-jf-warning",
  CONFIRMADA_ORIGEM: "bg-primary",
  REGISTRADA_SICAM: "bg-secondary",
  NAO_CONFIRMADA: "bg-destructive",
};

function InfoSection({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function HeroCard({
  tombo,
  emMovimentacao,
}: {
  tombo: TomboDetalhe;
  emMovimentacao: boolean;
}) {
  const statusLabel = !tombo.ativo
    ? "Inativo"
    : emMovimentacao
      ? "Em movimentação"
      : "Ativo";

  return (
    <div className="rounded-2xl bg-primary p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-2xl font-extrabold leading-none text-white">
          {tombo.numero}
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/80">
        {tombo.descricaoMaterial}
      </p>
    </div>
  );
}

function MovimentacaoHistorico({
  itens,
}: {
  itens: TomboDetalhe["itensMovimentacao"];
}) {
  return (
    <InfoSection titulo="Histórico de Movimentações">
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 border-t border-border px-4 py-3"
        >
          <div
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLOR[item.movimentacao.status] ?? "bg-muted"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {STATUS_LABEL[item.movimentacao.status] ??
                item.movimentacao.status}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateBR(item.movimentacao.createdAt)} ·{" "}
              {item.movimentacao.unidadeOrigem.codigo} →{" "}
              {item.movimentacao.unidadeDestino.codigo}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.movimentacao.tecnico.nome}
            </p>
          </div>
        </div>
      ))}
    </InfoSection>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TomboDetalhePage({ params }: Props) {
  const user = await requireRole(["TECNICO_TI", "SERVIDOR_SEMAP"]);
  const { id } = await params;

  const tombo = await buscarTomboDetalhe(id);
  if (!tombo) notFound();

  const emMovimentacao = tombo.itensMovimentacao.some((item) =>
    (MOVIMENTACAO_STATUS_EM_ANDAMENTO as readonly string[]).includes(
      item.movimentacao.status,
    ),
  );

  const nomeResp = nomeResponsavelExibicao(tombo);

  return (
    <div className="space-y-4">
      <Link
        href="/tombos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tombos
      </Link>

      <HeroCard tombo={tombo} emMovimentacao={emMovimentacao} />

      {(tombo.unidade || tombo.setor) && (
        <InfoSection titulo="Localização">
          {tombo.unidade && (
            <InfoRow label="Unidade" value={tombo.unidade.descricao} />
          )}
          {tombo.setor && (
            <InfoRow label="Setor" value={tombo.setor.nome} />
          )}
        </InfoSection>
      )}

      {nomeResp && (
        <InfoSection titulo="Responsável">
          <InfoRow label="Nome" value={nomeResp} />
          {(tombo.usuarioResponsavel?.matricula ||
            tombo.matriculaResponsavel) && (
            <InfoRow
              label="Matrícula"
              value={
                tombo.usuarioResponsavel?.matricula ??
                tombo.matriculaResponsavel!
              }
            />
          )}
        </InfoSection>
      )}

      {(tombo.nomeFornecedor || tombo.codigoFornecedor) && (
        <InfoSection titulo="Fornecedor">
          {tombo.nomeFornecedor && (
            <InfoRow label="Nome" value={tombo.nomeFornecedor} />
          )}
          {tombo.codigoFornecedor && (
            <InfoRow label="Código" value={tombo.codigoFornecedor} />
          )}
        </InfoSection>
      )}

      {tombo.itensMovimentacao.length > 0 && (
        <MovimentacaoHistorico itens={tombo.itensMovimentacao} />
      )}

      {user.perfil === "TECNICO_TI" && (
        <div
          className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-4 md:bottom-0 md:-mx-6 md:px-6"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href="/movimentacao/nova"
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            + Iniciar Movimentação
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/tombos/[id]/page.tsx"
git commit -m "feat(tombos): criar página de detalhe /tombos/[id] com hero card e histórico"
```

---

## Task 3: Atualizar toolbar, chips e filtros em `TombosList.tsx`

**Files:**
- Modify: `components/views/TombosList.tsx`

- [ ] **Step 1: Atualizar o toolbar (search full-width)**

Substitua o bloco `{/* Toolbar */}` (linhas 116–148 do arquivo atual) por:

```tsx
{/* Toolbar */}
<div className="flex items-center gap-2">
  <div className="relative min-w-0 flex-1">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      type="text"
      placeholder="Buscar por nº ou descrição..."
      defaultValue={busca}
      onChange={(e) => handleBuscaChange(e.target.value)}
      className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    />
  </div>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowFilters(!showFilters)}
    className="shrink-0"
  >
    <Filter className="h-4 w-4" data-icon="inline-start" />
    Filtros
    {hasFilters && (
      <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
        {[unidadeId, setorId].filter(Boolean).length}
      </span>
    )}
  </Button>
  {(hasFilters || busca || status !== "todos") && (
    <Button variant="ghost" size="sm" onClick={clearAll} className="shrink-0">
      <X className="h-4 w-4" data-icon="inline-start" />
      Limpar
    </Button>
  )}
</div>
```

- [ ] **Step 2: Atualizar os chips de status para scroll horizontal sem quebra**

Substitua o bloco `{/* Status chips */}` (linhas 151–167) por:

```tsx
{/* Status chips */}
<div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  {STATUS_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      onClick={() =>
        updateParams({ status: opt.value === "todos" ? "" : opt.value })
      }
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        status === opt.value ||
        (opt.value === "todos" && status === "todos")
          ? "bg-primary text-white"
          : "bg-muted text-muted-foreground hover:bg-accent"
      }`}
    >
      {opt.label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Atualizar placeholder do select de Setor no painel de filtros**

No painel de filtros (linhas 169–213), substitua o `<select>` do Setor:

```tsx
<select
  value={setorId}
  onChange={(e) => updateParams({ setor: e.target.value })}
  disabled={!unidadeId}
  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
>
  <option value="">{unidadeId ? "Todos" : "Selecione uma unidade"}</option>
  {setoresExibidos.map((s) => (
    <option key={s.id} value={s.id}>
      {s.nome}
    </option>
  ))}
</select>
```

- [ ] **Step 4: Verificar o build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/views/TombosList.tsx
git commit -m "feat(tombos): toolbar mobile full-width, chips scrolláveis, filtro setor com placeholder"
```

---

## Task 4: Cards mobile — rich cards com Link

**Files:**
- Modify: `components/views/TombosList.tsx`

- [ ] **Step 1: Adicionar import de Link no topo de `TombosList.tsx`**

Adicione ao bloco de imports existente:

```typescript
import Link from "next/link";
```

- [ ] **Step 2: Substituir o bloco de cards mobile**

Substitua o bloco `{/* Mobile: cards */}` (linhas 231–265) por:

```tsx
{/* Mobile: cards */}
<div className="space-y-3 md:hidden">
  {tombos.map((tombo) => (
    <Link
      key={tombo.id}
      href={`/tombos/${tombo.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold text-primary">
          # {tombo.numero}
        </span>
        <TomboStatusBadge tombo={tombo} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
        {tombo.descricaoMaterial}
      </p>
      {(tombo.unidade ||
        tombo.setor ||
        nomeResponsavelExibicao(tombo)) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
          {tombo.unidade && <span>{tombo.unidade.descricao}</span>}
          {tombo.setor && <span>{tombo.setor.nome}</span>}
          {nomeResponsavelExibicao(tombo) && (
            <span>{nomeResponsavelExibicao(tombo)}</span>
          )}
        </div>
      )}
      <div className="mt-1.5 flex justify-end">
        <span className="text-xs font-semibold text-primary">
          Ver detalhes ›
        </span>
      </div>
    </Link>
  ))}
</div>
```

- [ ] **Step 3: Verificar o build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/views/TombosList.tsx
git commit -m "feat(tombos): cards mobile ricos com Link, hierarquia visual e affordance de tap"
```

---

## Task 5: Tabela desktop — linhas navegáveis com `useRouter`

**Files:**
- Modify: `components/views/TombosList.tsx`

- [ ] **Step 1: Adicionar `useRouter` ao import de `next/navigation` no topo**

Adicione ao bloco de imports existente:

```typescript
import { useRouter } from "next/navigation";
```

- [ ] **Step 2: Instanciar o router dentro do componente `TombosList`**

Após a linha `const { widths, onPointerDown, onPointerMove, onPointerUp } = useColumnResize(COLUMNS);` adicione:

```typescript
const router = useRouter();
```

- [ ] **Step 3: Atualizar as linhas `<tr>` da tabela desktop para navegar ao clicar**

Substitua cada `<tr>` do tbody (linhas 303–329):

```tsx
<tr
  key={tombo.id}
  onClick={() => router.push(`/tombos/${tombo.id}`)}
  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
>
```

O restante do `<tr>` (as `<td>` cells) permanece idêntico.

- [ ] **Step 4: Rodar todos os testes para garantir nenhuma regressão**

```bash
npm run test
```

Saída esperada: todos os testes passando.

- [ ] **Step 5: Commit final**

```bash
git add components/views/TombosList.tsx
git commit -m "feat(tombos): linhas da tabela desktop navegáveis via useRouter"
```

---

## Self-review checklist

- [x] **Spec coverage:** query `buscarTomboDetalhe` (Task 1) ✓ · detail page com hero card + seções + histórico (Task 2) ✓ · toolbar full-width (Task 3) ✓ · chips scrolláveis (Task 3) ✓ · rich cards com Link (Task 4) ✓ · tabela desktop navegável (Task 5) ✓ · CTA sticky visível só para TECNICO_TI (Task 2) ✓
- [x] **Sem placeholders:** todos os steps têm código completo
- [x] **Consistência de tipos:** `TomboDetalhe` exportado em Task 1 e importado em Task 2 · `buscarTomboDetalhe` importado no test e na page · `useRouter` instanciado antes de usar em Task 5
- [x] **Restrições do CLAUDE.md respeitadas:** `'use client'` não adicionado (TombosList já era client) · `useRouter` só usado porque `TombosList` já é Client Component · página de detalhe é Server Component · sem lógica em componentes inline desnecessária
