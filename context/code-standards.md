# Code Standards — PATRIMOVE (SIMAP)

## TypeScript

- **Strict mode** sempre ligado (`tsconfig.json`: `"strict": true`)
- **`import type`** para imports de tipos: `import type { Tombo } from "@/lib/generated/prisma/client"`
- **Sem `any`** explícito — usar `unknown` e narrowing ou tipos específicos
- **Inferência**: preferir inferência onde o tipo é óbvio; anotar explicitamente retornos de funções públicas
- Path alias `@/` aponta para a raiz do projeto (não `src/`)

---

## Nomenclatura

| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `MovimentacaoForm`, `StatusBadge` |
| Hooks | camelCase com prefixo `use-` (arquivo) / `use` (função) | `use-toast.ts` → `useToast()` |
| Server Actions | camelCase, verbo + substantivo | `criarMovimentacao`, `confirmarRecebimento` |
| Query functions | camelCase, `get`/`list`/`find` | `getMovimentacaoById`, `listTombos` |
| Service functions | camelCase, verbo descritivo | `sendConfirmacaoEmail`, `syncSicamTombos` |
| Schemas Zod | PascalCase + `Schema` | `CriarMovimentacaoSchema`, `AdminUnidadeSchema` |
| Arquivos de componente | PascalCase | `MovimentacaoForm.tsx` |
| Arquivos de hook/util | kebab-case | `use-debounced-callback.ts`, `query-builders.ts` |
| Arquivos de action/query | kebab-case por entidade | `movimentacao.ts`, `admin.ts` |
| Modelos Prisma | PascalCase singular | `Tombo`, `Movimentacao`, `AuditLog` |
| Campos Prisma | camelCase | `codigoFornecedor`, `matriculaResponsavel` |
| Enums Prisma | UPPER_SNAKE_CASE | `PENDENTE_CONFIRMACAO`, `TECNICO_TI` |
| Variáveis CSS / tokens | kebab-case com prefixo `--` | `--color-primary`, `--spacing-4` |

---

## Estrutura de Server Actions

```typescript
'use server'

import { requireAuthAction } from "@/lib/auth-guard"
import { CriarMovimentacaoSchema } from "@/lib/validations/movimentacao"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/server/services/audit"
import { sendEmail } from "@/server/services/email"

export async function criarMovimentacao(input: unknown) {
  // 1. Autenticação (sempre primeiro)
  const session = await requireAuthAction(["TECNICO_TI"])
  if (!session.success) return session

  // 2. Validação Zod
  const parsed = CriarMovimentacaoSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" }
  }

  // 3. Lógica de negócio
  try {
    const mov = await prisma.movimentacao.create({ ... })

    // 4. Auditoria (sempre após mutação bem-sucedida)
    await logAudit({ acao: "CRIAR_MOVIMENTACAO", entidade: "Movimentacao", entidadeId: mov.id, usuarioId: session.data.id })

    // 5. Side effects fire-and-forget (nunca await)
    void sendEmail(...)

    return { success: true, data: mov }
  } catch (err) {
    logger.error({ err }, "Erro ao criar movimentação")
    return { success: false, error: "Erro interno ao criar movimentação" }
  }
}
```

**Regras de retorno:**
- Sempre `{ success: boolean, data?: T, error?: string }`
- Nunca `throw` para erros esperados
- `error` deve ser string legível para o usuário

---

## Estrutura de Server Queries

```typescript
import { requireAuth } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { buildStatusFilter } from "@/lib/query-builders"

// Chamada em Server Component — sem 'use server', sem 'use client'
export async function listMovimentacoes(params: { status?: string; page?: number }) {
  const session = await requireAuth() // redireciona se não autenticado

  const where = buildStatusFilter(params.status)
  const [items, total] = await prisma.$transaction([
    prisma.movimentacao.findMany({
      where,
      skip: ((params.page ?? 1) - 1) * 20,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { unidadeOrigem: true, unidadeDestino: true, itens: { include: { tombo: true } } },
    }),
    prisma.movimentacao.count({ where }),
  ])

  return { items, total, page: params.page ?? 1, pageSize: 20 }
}
```

---

## Estrutura de Componentes

### Server Component (default)
```typescript
// app/(dashboard)/movimentacao/page.tsx
import { listMovimentacoes } from "@/server/queries/movimentacao"
import { MovimentacaoList } from "@/components/views/movimentacao/MovimentacaoList"

export default async function MovimentacaoPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  const data = await listMovimentacoes({ page: Number(page ?? 1) })
  return <MovimentacaoList data={data} />
}
```

### Client Component (quando necessário)
```typescript
'use client'

import { useState } from "react"
import { criarMovimentacao } from "@/server/actions/movimentacao"
import { useToast } from "@/lib/hooks/use-toast"

export function MovimentacaoForm() {
  const { toast } = useToast()
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await criarMovimentacao(Object.fromEntries(formData))
    if (!result.success) toast({ title: result.error, variant: "destructive" })
    setPending(false)
  }

  return <form action={handleSubmit}>...</form>
}
```

---

## Tratamento de erros

| Contexto | Padrão |
|----------|--------|
| Server Action | `try/catch` → `return { success: false, error: string }` |
| Server Query | Erros propagam para o Error Boundary do Next.js |
| Service | `throw` ou retornar resultado com erro — depende do contrato do service |
| Email | Fire-and-forget com `void` + log de erro |
| Oracle/LDAP | Erros específicos em `lib/sicam-oracle/errors.ts` e `lib/ldap/` |
| Validação Zod | `safeParse` — nunca `parse` em Server Actions |

---

## Comentários no código

- **Sem comentários** para código que se auto-explica por nome
- **Comentar apenas**: invariantes não-óbvios, workarounds de bugs, restrições externas
- **Sem docstrings** em funções internas
- Quando necessário: uma linha curta, não um parágrafo

---

## Imports e exports

```typescript
// ✅ Correto: import type para tipos
import type { StatusMovimentacao } from "@/lib/generated/prisma/client"

// ✅ Correto: path alias sempre
import { prisma } from "@/lib/prisma"

// ❌ Errado: path relativo
import { prisma } from "../../lib/prisma"

// ✅ Correto: re-export nomeado (não default) em barrels de lib
export { getMovimentacaoById, listMovimentacoes }
```

---

## Testes

- **Vitest** para unit/integração, **Playwright** para E2E
- Nomes em português: `it('deve criar movimentação com múltiplos tombos')`
- Mock de LDAP e SMTP — nunca conectar a serviços reais em testes
- Para E2E: `LDAP_URL=""` no env desativa LDAP (usa auth via DB)
- Seed de usuários de teste via `e2e/global-setup.ts`
- Testes unitários em `__tests__/` adjacentes ao arquivo testado

---

## Acessibilidade e UX

- Debounce de 300ms em todos os campos de busca
- Feedback de loading em todos os formulários (`pending` state)
- Mensagens de erro em português, orientadas à ação
- Paginação server-side para todas as listagens (page no query param)
- Bottom nav no mobile, sidebar no desktop (responsivo via AppLayout)
