# SIMAP — Sistema de Movimentação e Acompanhamento Patrimonial

## O que é

Aplicação web responsiva (mobile-first) da Justiça Federal do Amapá (JFAP) para registro e rastreabilidade de movimentações de bens patrimoniais. Resolve o gap de comunicação entre a TI (que movimenta equipamentos) e a SEMAP (que registra no sistema legado SICAM).

## Stack

- **Framework:** Next.js 16 + TypeScript strict + App Router
- **UI:** Tailwind CSS + shadcn/ui (customizado com paleta institucional JF)
- **Banco:** PostgreSQL 16 via Prisma ORM
- **Auth:** NextAuth.js v5 com provider LDAP/AD
- **Scanner:** @zxing/library (Code 128)
- **E-mail:** Nodemailer (SMTP interno)
- **Gráficos:** Recharts
- **Tabelas:** TanStack Table
- **Validação:** Zod
- **Testes:** Vitest + Testing Library (unit/integration), Playwright (E2E)
- **Deploy:** Docker Compose (app + PostgreSQL) em VPS interna

## Estrutura do projeto

```
app/
  (auth)/login/           — Login LDAP (sem layout autenticado)
  (dashboard)/            — Layout autenticado (sidebar + bottom nav)
    home/                 — Home contextual por perfil
    movimentacao/         — Nova movimentação, detalhe, histórico
    patrimonio/           — Meus patrimônios (servidor responsável)
    backlog/              — Backlog SEMAP
    importacao/           — Upload CSV + histórico
    admin/                — CRUD (unidades, setores, responsáveis, perfis)
    dashboard/            — Dashboard gerencial
    notificacoes/         — Central de notificações (mobile)
  confirmar/[token]/      — Página pública de confirmação (sem login)
components/
  layout/                 — AppLayout, Sidebar, BottomNav, Header
  ui/                     — shadcn/ui customizados
  common/                 — Scanner, EmptyState, StatusBadge, NotificationBell, KPICard
  views/                  — Componentes específicos de tela
lib/                      — types.ts, validations.ts, utils.ts, auth.ts
server/
  actions/                — Server Actions (mutações)
  queries/                — Queries de leitura
  services/               — Email, CSV parser, auditoria
prisma/                   — Schema, migrations, seed
```

## Comandos

- `npm run dev` — Dev server
- `npm run build` — Build de produção
- `npm run lint` — ESLint
- `npx prisma migrate dev` — Rodar migrations
- `npx prisma db seed` — Seed de dados de teste
- `npm run test` — Testes unitários/integração (Vitest)
- `npm run test:e2e` — Testes E2E (Playwright)
- `docker compose up -d` — Subir containers (app + db)

## Regras de desenvolvimento

- IMPORTANT: Sempre use Server Components como default. Use `'use client'` SOMENTE para: Scanner, formulários interativos, bottom sheet, dropdowns com busca, gráficos Recharts, polling de notificações, toasts.
- IMPORTANT: Toda mutação de dados deve usar Server Actions, NUNCA API Routes.
- IMPORTANT: Registros de auditoria são imutáveis (somente INSERT, nunca UPDATE ou DELETE).
- Use `import type` para importação de tipos.
- Valide TODOS os inputs com Zod — tanto no client quanto no server.
- Paginação server-side para todas as listagens (20-50 itens por página).
- Listas com mais de 100 itens devem usar virtualização (react-virtual).
- Debounce de 300ms em campos de busca.
- Todas as rotas autenticadas devem ser protegidas por middleware NextAuth.
- O CSV do SICAM usa encoding Latin-1 e delimitador ponto e vírgula (;).

## 4 perfis de usuário

1. **Técnico TI** — Registra movimentações via scanner, importa CSV
2. **Servidor Responsável** — Confirma saída de tombos, visualiza patrimônios
3. **Servidor SEMAP** — Processa backlog, registra no SICAM, importa CSV, CRUD admin
4. **Gestor/Admin** — Dashboard gerencial, CRUD admin completo

## Identidade visual

- Cor primária: `#003366` (azul institucional JF)
- Cor secundária: `#2D6E2D` (verde institucional JF)
- Fundo: `#F2F2F2`, superfícies: `#FFFFFF`
- Texto: `#333333` (principal), `#666666` (secundário)
- Status badges: Pendente `#D4A017`, Confirmada `#003366`, Registrada SICAM `#2D6E2D`, Erro `#CC3333`
- Tipografia: Inter (fallback Century Gothic/Calibri)
- Sem gradientes. Visual limpo e institucional.

## Ondas de entrega

- **Onda 1 (Core):** Auth LDAP, importação CSV, scanner Code 128, registro de movimentação, e-mails SMTP, confirmação pública (token), home técnico, auditoria
- **Onda 2 (Operacional):** Backlog SEMAP, registro SICAM, meus patrimônios, CRUD admin, notificações in-app, histórico
- **Onda 3 (Gerencial):** Dashboard KPIs, gráficos Recharts, relatórios auditoria, histórico importações

## Documentação detalhada

Consulte a pasta `docs/` para especificações completas:
- @docs/PRD.md — Requisitos de produto
- @docs/UX_UI.md — Especificações de UX/UI (telas, fluxos, componentes)
- @docs/MVP.md — Conceito e escopo do MVP
- @docs/PLANO_DEV.md — Plano de desenvolvimento e roadmap
- @docs/VISUAL_PROMPT.md — Design tokens, estilos, especificações visuais
