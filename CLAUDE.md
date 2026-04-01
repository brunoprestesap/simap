# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

PATRIMOVE (SIMAP) — mobile-first web app for the Justiça Federal do Amapá (JFAP) to track asset movements between organizational units. Bridges the communication gap between IT (who physically moves equipment) and SEMAP (who registers in the legacy SICAM system).

## Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest unit/integration tests
npm run test:watch       # Vitest in watch mode
npm run test:e2e         # Playwright E2E tests
npx vitest run path/to/file.test.ts  # Run a single test file
npx playwright test e2e/file.spec.ts # Run a single E2E test
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed test data (via tsx prisma/seed.ts)
docker compose up -d     # Start PostgreSQL (port 5432, user/pass/db: simap)
```

## Architecture

**Next.js 16 App Router** with two route groups:
- `(auth)/` — login page, no authenticated layout
- `(dashboard)/` — all authenticated pages, wrapped in `AppLayout` (sidebar desktop + bottom nav mobile)
- `confirmar/[token]/` — public confirmation page (no auth required)

**Auth flow:** NextAuth v5 with Credentials provider. `middleware.ts` uses edge-compatible `auth.config.ts` (no Prisma). Full auth with Prisma lives in `lib/auth.ts`. Session uses JWT with custom fields: `id`, `matricula`, `nome`, `perfil`.

**Auth guards:** Use `requireAuth()`/`requireRole()` from `lib/auth-guard.ts` in Server Components (redirects). Use `requireAuthAction()`/`requireRoleAction()` in Server Actions (returns error objects, never throws).

**Data flow:**
- **Reads:** `server/queries/` — plain async functions called from Server Components
- **Writes:** `server/actions/` — Server Actions with `'use server'`, validated with Zod, return `{ success, data?, error? }`
- **Services:** `server/services/` — email, CSV parser, LDAP, audit logging, notifications

**Prisma:** Generated client outputs to `lib/generated/prisma/`. Schema at `prisma/schema.prisma`. IDs use `cuid()`.

**Navigation:** Profile-based — each of the 4 profiles (`PerfilUsuario` enum) sees different nav items. Defined in `lib/types.ts` (`NAV_ITEMS_BY_PROFILE`). Layout components in `components/layout/`.

**Components organization:**
- `components/ui/` — shadcn/ui primitives
- `components/common/` — shared components (Scanner, StatusBadge, KPICard, EmptyState, Pagination)
- `components/views/` — page-specific components, including `home/` with per-profile home views

**4 user profiles:** `TECNICO_TI`, `SERVIDOR_RESPONSAVEL`, `SERVIDOR_SEMAP`, `GESTOR_ADMIN`

## Key rules

- **Server Components are the default.** Only use `'use client'` for: scanner, interactive forms, bottom sheet, search dropdowns, Recharts charts, notification polling, toasts.
- **All mutations via Server Actions**, never API Routes (only exception: `api/auth/[...nextauth]`).
- **AuditLog is immutable** — INSERT only, never UPDATE or DELETE. No `onDelete: Cascade` on AuditLog relations.
- **Validate all inputs with Zod** on both client and server.
- **Server Actions return result objects** `{ success: boolean, data?: T, error?: string }` — never throw for expected errors.
- **CSV from SICAM** uses Latin-1 encoding and `;` delimiter. Parser must handle this explicitly.
- **Email sending is fire-and-forget** — never block the user response. Log errors.
- **Confirmation tokens** generated with `crypto.randomUUID()`, expiry via `TOKEN_EXPIRY_DAYS` env var.
- **Server-side pagination** for all listings (20-50 items). Virtualize lists > 100 items.
- **Debounce 300ms** on search fields.
- Use `import type` for type imports.

## Visual identity

- Primary: `#003366` (blue), Secondary: `#2D6E2D` (green)
- Background: `#F2F2F2`, Surfaces: `#FFFFFF`
- Text: `#333333` (primary), `#666666` (secondary)
- Status badges: Pendente `#D4A017`, Confirmada `#003366`, Registrada SICAM `#2D6E2D`, Erro `#CC3333`
- Font: Inter. No gradients.

## Testing

- **Vitest** (jsdom): unit tests in `__tests__/` dirs or `*.test.{ts,tsx}` files. Setup in `vitest.setup.ts`. Path alias `@` resolves to project root.
- **Playwright**: E2E tests in `e2e/` directory.
- Mock LDAP and SMTP in integration tests — never connect to real services.
- Test names in Portuguese, descriptive: `it('deve registrar movimentação com múltiplos tombos')`.

## Delivery waves

- **Onda 1 (Core):** Auth, CSV import, scanner, movement registration, email notifications, public confirmation, audit
- **Onda 2 (Operational):** SEMAP backlog, SICAM registration, "my assets" view, admin CRUD, in-app notifications, history
- **Onda 3 (Managerial):** Dashboard KPIs, Recharts charts, audit reports, CSV import history

## Detailed docs

See `docs/` for full specifications: PRD.md, UX_UI.md, MVP.md, PLANO_DEV.md, VISUAL_PROMPT.md
