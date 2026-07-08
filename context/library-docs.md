# Library Docs — Como usamos cada biblioteca no SIMAP

> Antes de usar qualquer biblioteca: verificar se existe contexto neste arquivo. Não inventar APIs — checar aqui primeiro.

---

## Next.js 16 App Router

**O que usamos:**
- App Router exclusivamente (sem Pages Router)
- Server Components como default
- Server Actions para todas as mutações (`'use server'` + função assíncrona exportada)
- `searchParams` em páginas são `Promise<>` e devem ser `await`ed
- `output: "standalone"` no `next.config.ts` para Docker

**Padrões deste projeto:**
```typescript
// page.tsx — searchParams são Promise no Next.js 16
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  // ...
}

// Server Action com 'use server'
'use server'
export async function minhaAction(input: unknown) { ... }

// revalidar cache após mutação
import { revalidatePath } from "next/cache"
revalidatePath("/movimentacao")
```

**Configuração relevante (`next.config.ts`):**
- `serverExternalPackages: ["pg", "@prisma/adapter-pg", "oracledb"]` — não bundlizar estas libs
- `serverActions.bodySizeLimit: "10mb"` — para upload de CSV
- CSP, HSTS, X-Frame-Options via `headers()`

---

## Prisma 7.6 + adapter-pg

**Schema:** `prisma/schema.prisma`. Gerado em `lib/generated/prisma/`.

**Singleton do cliente:**
```typescript
// lib/prisma.ts — importar sempre daqui
import { prisma } from "@/lib/prisma"
```

**Padrões deste projeto:**
```typescript
// Busca com paginação
const [items, total] = await prisma.$transaction([
  prisma.tombo.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
  prisma.tombo.count({ where }),
])

// Upsert para sync Oracle
await prisma.tombo.upsert({
  where: { numero: tomboData.numero },
  create: { ...tomboData },
  update: { ...tomboData },
})

// AuditLog: INSERT-only, nunca update/delete
await prisma.auditLog.create({
  data: { acao, entidade, entidadeId, usuarioId, detalhes }
})
```

**Migrações:** sempre `npx prisma migrate dev` para dev. Nunca editar migrations existentes.

---

## NextAuth v5 (next-auth@5.0.0-beta.30)

**Dois arquivos de config:**
- `lib/auth.config.ts` — edge-compatible (sem Prisma, sem imports Node-only). Usado em `middleware.ts`.
- `lib/auth.ts` — config completa com Prisma. Usado no resto da aplicação.

**Uso:**
```typescript
// Em Server Components / Actions — importar de lib/auth.ts
import { auth } from "@/lib/auth"
const session = await auth()

// Preferir os guards ao invés de auth() diretamente
import { requireAuth, requireAuthAction } from "@/lib/auth-guard"

// Guard em Server Component (redireciona se não autenticado)
const session = await requireAuth()

// Guard em Server Action (retorna erro se não autenticado)
const result = await requireAuthAction(["TECNICO_TI", "GESTOR_ADMIN"])
if (!result.success) return result
const { id, matricula, perfil } = result.data
```

**JWT customizado:** `id`, `matricula`, `nome`, `perfil` disponíveis em `session.user`.

---

## Zod 4.x

**Import correto neste projeto:**
```typescript
import { z } from "zod/v4"  // ← Zod 4 usa este path
```

**Schemas ficam em `lib/validations/`:**
```typescript
// lib/validations/movimentacao.ts
export const CriarMovimentacaoSchema = z.object({
  unidadeDestinoId: z.string().cuid(),
  setorDestinoId: z.string().cuid().optional(),
  tomboIds: z.array(z.string().cuid()).min(1, "Selecione pelo menos um tombo"),
})
export type CriarMovimentacaoInput = z.infer<typeof CriarMovimentacaoSchema>
```

**Em Server Actions — sempre `safeParse`:**
```typescript
const parsed = MeuSchema.safeParse(input)
if (!parsed.success) return { success: false, error: "Dados inválidos" }
const data = parsed.data
```

---

## Tailwind CSS 4

**Import no CSS:**
```css
@import "tailwindcss";
```

**Tokens CSS customizados** definidos em `app/globals.css` com variáveis `--color-*`.
`unsafe-inline` em style-src é necessário — ver `next.config.ts`.

**Merge de classes:**
```typescript
import { cn } from "@/lib/utils"
// cn usa clsx + tailwind-merge
className={cn("base-classes", condition && "conditional-class", props.className)}
```

---

## shadcn/ui + Base UI

**Componentes shadcn** em `components/ui/`. Instalar novos com:
```bash
npx shadcn@latest add [component]
```

**Regra:** antes de criar um componente customizado, verificar se existe primitivo shadcn adequado. Verificar também `ui-registry.md`.

**Base UI** (`@base-ui/react`) para componentes headless quando shadcn não tem o primitivo necessário.

---

## Recharts 3

**Apenas em Client Components** (`'use client'`). Nunca importar em Server Components.

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export function DashboardChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="total" fill="var(--color-primary)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## oracledb 6.10 (SICAM Oracle)

**Toda a lógica Oracle está em `lib/sicam-oracle/` e `server/services/sicam-sync.ts`.**

**Nunca importar `oracledb` diretamente** fora de `lib/sicam-oracle/`. Usar o cliente encapsulado:

```typescript
import { getSicamClient } from "@/lib/sicam-oracle"
import { SicamOracleError } from "@/lib/sicam-oracle/errors"

const client = await getSicamClient()
try {
  const result = await client.query("SELECT * FROM PATRIMONIO WHERE ...")
} catch (err) {
  if (err instanceof SicamOracleError) { ... }
}
```

**Oracle Instant Client:** opcional. Necessário apenas para thick mode (Oracle DB com autenticador legado). Configurar via `SICAM_ORACLE_INSTANT_CLIENT_DIR`.

---

## ldapts 8

**Toda a lógica LDAP está em `lib/ldap/` e `server/services/ldap.ts`.**

**Nunca usar ldapts diretamente** fora de `lib/ldap/client.ts`. Configuração via env vars `LDAP_*`.

**Para testes:** `LDAP_URL=""` desativa LDAP completamente. Auth cai para DB credentials.

---

## Nodemailer 7

**Usado exclusivamente em `server/services/email.ts`.**

**Regra cardinal:** sempre fire-and-forget — `void sendEmail(...)`. Nunca `await` no caminho de resposta ao usuário.

```typescript
// ✅ Correto
void emailService.sendConfirmacaoEmail({ to: email, token, nomeResp })

// ❌ Errado — bloqueia a resposta
await emailService.sendConfirmacaoEmail(...)
```

Templates HTML em `server/services/email-templates.ts`.

---

## Pino 10 (logging)

**Loggers por módulo em `lib/logger.ts`:**
```typescript
import { createLogger } from "@/lib/logger"
const logger = createLogger("movimentacao")

logger.info({ movimentacaoId }, "Movimentação criada")
logger.error({ err, input }, "Falha ao criar movimentação")
```

Nível configurável via `LOG_LEVEL` env var. Em produção: `info`. Em dev: `debug`.

---

## lucide-react

**Ícones por entidade** definidos em `lib/constants.ts` (`NOTIFICACAO_ICONS`, etc.).

```typescript
import { ArrowLeftRight, CheckCircle2 } from "lucide-react"
// Sempre usar tamanho pelo className, não pelo prop size quando possível
<ArrowLeftRight className="h-4 w-4" />
```

---

## @tanstack/react-table

**Usado em tabelas admin** com `AdminDataTable.tsx`.

Sempre `'use client'` no componente que usa a tabela. Colunas definidas com `ColumnDef<T>[]` tipados.

---

## html5-qrcode

**Encapsulado em `components/common/Scanner.tsx`** e helpers em `lib/scanner/`.

Nunca importar `html5-qrcode` diretamente em páginas ou outros componentes. Usar `<Scanner onScan={fn} />`.

---

## Env vars (lib/env.ts)

**Nunca `process.env.VARIAVEL` diretamente.** Importar o proxy `env`:

```typescript
import { env } from "@/lib/env"
const url = env.DATABASE_URL
const dias = env.TOKEN_EXPIRY_DAYS // number, já coercido
```

**Exceção:** `middleware.ts` e `auth.config.ts` são edge-compatible — usar `process.env` diretamente lá.
