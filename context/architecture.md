# Architecture — PATRIMOVE (SIMAP)

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js App Router | 16.2.1 |
| Runtime UI | React | 19.2.4 |
| Linguagem | TypeScript | 5.x (strict) |
| ORM | Prisma + adapter-pg | 7.6.0 |
| Banco principal | PostgreSQL | 16 |
| Banco legado (leitura) | Oracle (SICAM) via oracledb | 6.10.0 |
| Autenticação | NextAuth v5 (Credentials + LDAP) | 5.0.0-beta.30 |
| UI Components | shadcn/ui + Base UI | latest |
| Estilos | Tailwind CSS | 4.x |
| Gráficos | Recharts | 3.x |
| LDAP | ldapts | 8.x |
| E-mail | Nodemailer | 7.x |
| Validação | Zod | 4.x |
| Logging | Pino | 10.x |
| Testes unitários | Vitest + Testing Library | 3.x |
| Testes E2E | Playwright | 1.x |
| Node.js mínimo | 20.11+ | — |

---

## Estrutura de pastas

```
simap/
├── app/                        # Rotas Next.js App Router
│   ├── (auth)/login/           # Login — sem AppLayout
│   ├── (dashboard)/            # Todas as páginas autenticadas — com AppLayout
│   │   ├── home/
│   │   ├── movimentacao/
│   │   │   ├── nova/
│   │   │   ├── lote/
│   │   │   ├── historico/
│   │   │   └── [id]/
│   │   ├── tombos/[id]/
│   │   ├── patrimonio/
│   │   ├── meus-tombos/
│   │   ├── backlog/
│   │   ├── dashboard/
│   │   ├── importacao/historico/
│   │   ├── notificacoes/
│   │   └── admin/
│   │       ├── unidades/
│   │       ├── setores/
│   │       ├── perfis/
│   │       ├── responsaveis/
│   │       └── sicam/
│   ├── confirmar/[token]/      # Confirmação pública (sem auth)
│   └── api/
│       ├── auth/[...nextauth]/ # Único endpoint auth
│       └── health/             # Health check
│
├── server/
│   ├── actions/                # Server Actions ('use server') — ÚNICA fonte de mutação
│   ├── queries/                # Funções de leitura para Server Components
│   └── services/               # Lógica reutilizável (email, LDAP, audit, CSV, SICAM)
│
├── components/
│   ├── ui/                     # shadcn/ui primitivos (Button, Input, etc.)
│   ├── common/                 # Componentes compartilhados (Scanner, StatusBadge, etc.)
│   ├── layout/                 # AppLayout, Sidebar, BottomNav, Header
│   └── views/                  # Componentes específicos de página
│       ├── home/               # TecnicoHome, ResponsavelHome, SemapHome, GestorHome
│       ├── movimentacao/
│       ├── tombos/
│       ├── patrimonio/
│       ├── backlog/
│       ├── admin/
│       └── dashboard/
│
├── lib/
│   ├── generated/prisma/       # Cliente Prisma gerado (não editar manualmente)
│   ├── sicam-oracle/           # Cliente Oracle SICAM (config, pool, health, errors)
│   ├── ldap/                   # Autenticação LDAP (client, config, filters)
│   ├── hooks/                  # Hooks client-side
│   ├── permissions/            # ACL (movimentacao-confirmacao.ts)
│   ├── validations/            # Schemas Zod por entidade
│   ├── scanner/                # Helpers de câmera e código de barras
│   ├── auth.ts                 # NextAuth config completa (com Prisma)
│   ├── auth.config.ts          # Config edge-compatible (sem Prisma)
│   ├── auth-guard.ts           # requireAuth, requireRole, requireAuthAction
│   ├── constants.ts            # STATUS_CONFIG, PERFIL_LABELS, NOTIFICACAO_ICONS
│   ├── env.ts                  # Validação de env vars com Zod (proxy lazy)
│   ├── logger.ts               # Loggers Pino por módulo
│   ├── prisma.ts               # Singleton do PrismaClient
│   ├── query-builders.ts       # Builders de cláusulas where Prisma
│   ├── types.ts                # NavItem, NAV_ITEMS_BY_PROFILE
│   └── utils.ts                # cn(), classnames
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── e2e/                        # Playwright E2E
├── docs/                       # PRD, UX, specs
├── deploy/                     # Scripts de deploy, Nginx, certs
└── scripts/                    # Utilitários de desenvolvimento
```

---

## Regras inegociáveis da arquitetura

### Separação de responsabilidades

1. **Server Components são o default.** Adicionar `'use client'` apenas para: scanner, formulários interativos com estado local, bottom sheets, dropdowns de busca, gráficos Recharts, polling de notificações, toasts.

2. **Mutações APENAS via Server Actions.** Nunca criar API Routes para mutação. Exceções aceitas: `api/auth/[...nextauth]` e `api/health`.

3. **Queries em `server/queries/`, nunca em componentes.** Componentes chamam query functions; jamais chamam Prisma diretamente.

4. **Services não conhecem React.** `server/services/` contém lógica pura — sem imports de `next/`, `react`, ou componentes.

5. **`lib/` não contém lógica de banco.** `lib/` é para tipos, validações, configurações e hooks. Lógica de banco fica em `server/`.

### Segurança

6. **Sempre usar `requireAuth()` ou `requireAuthAction()`.** Nenhuma página ou Server Action pode ser acessada sem verificação de sessão. Não verificar manualmente a sessão — usar os guards.

7. **Nunca usar `process.env` diretamente no código da aplicação.** Importar `env` de `lib/env.ts`. Exceção: `middleware.ts` e `auth.config.ts` (edge-compatible, sem Zod).

8. **Validar toda entrada com Zod** — tanto no cliente (feedback imediato) quanto no servidor (Server Action, que é a fonte de verdade).

### Dados e integridade

9. **AuditLog é imutável.** INSERT only. Jamais UPDATE ou DELETE em AuditLog. Sem `onDelete: Cascade` em relações com AuditLog.

10. **E-mail é fire-and-forget.** Nunca `await` no envio de e-mail no caminho principal. Usar `void emailService.send(...)` e logar erros.

11. **Paginação server-side para todas as listagens.** Padrão: 20 itens/página (admin), 50 para backlog. Virtualizar listas > 100 itens.

12. **Status de movimentação é one-way.** `PENDENTE_CONFIRMACAO → CONFIRMADA_DESTINO → REGISTRADA_SICAM`. Nenhuma transição reversa é permitida. `NAO_CONFIRMADA` é um estado terminal paralelo (token expirado sem confirmação).

### Prisma e banco

13. **Nunca editar ou deletar migrations já aplicadas.** Sempre criar nova migration para qualquer alteração de schema.

14. **IDs:** `@default(cuid())`. Todo modelo tem `createdAt @default(now())` e `updatedAt @updatedAt`.

15. **Índices obrigatórios** em campos usados em filtros: `status`, `createdAt`, `unidadeId`, `matriculaResponsavel`, `tokenConfirmacao`.

### Padrões de retorno

16. **Server Actions retornam `{ success: boolean, data?: T, error?: string }`.** Jamais lançar exceção para erros esperados. Usar `try/catch` e retornar `{ success: false, error: mensagem }`.

17. **Nomear testes em português**, descritivos: `it('deve criar movimentação com múltiplos tombos')`.

---

## Fluxo de dados (resumo)

```
Browser
  │
  ├─ Server Component → server/queries/ → prisma → PostgreSQL
  │
  └─ 'use client' Component
       │
       ├─ Server Action → server/actions/ → Zod validate → server/services/ → prisma
       │                                                   └─ email (fire-and-forget)
       │                                                   └─ audit log (INSERT-only)
       │
       └─ (Oracle, LDAP, SMTP — apenas em server/services/)
```
