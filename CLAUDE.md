# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

PATRIMOVE (SIMAP) — mobile-first web app for the Justiça Federal do Amapá (JFAP) to track asset movements between organizational units. Bridges the communication gap between IT (who physically moves equipment) and SEMAP (who registers in the legacy SICAM system). Asset data is sourced primarily via **direct Oracle integration with SICAM** (sync panel in `/admin/sicam`); CSV import remains available as a **contingency fallback** only.

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

**Lib utilities:**
- `lib/env.ts` — validates all env vars with Zod at startup; always import from here, never from `process.env` directly
- `lib/permissions/movimentacao-confirmacao.ts` — ACL rules for who can confirm each movimentação
- `lib/query-builders.ts` — reusable Prisma `where` clause builders for common filter patterns
- `lib/hooks/` — client-side hooks: `use-admin-crud`, `use-admin-form`, `use-debounced-callback`, `use-toast`, `use-url-params`, `use-tombo-selection`, `use-click-outside`, `use-column-resize`

**Prisma:** Generated client outputs to `lib/generated/prisma/`. Schema at `prisma/schema.prisma`. IDs use `cuid()`.

**Movimentação status flow:** `PENDENTE_CONFIRMACAO` → `CONFIRMADA_DESTINO` → `REGISTRADA_SICAM`. Transitions are one-way and irreversible; ACL enforced by `lib/permissions/movimentacao-confirmacao.ts`.

**Navigation:** Profile-based — each of the 4 profiles (`PerfilUsuario` enum) sees different nav items. Defined in `lib/types.ts` (`NAV_ITEMS_BY_PROFILE`). Layout components in `components/layout/`.

**Components organization:**
- `components/ui/` — shadcn/ui primitives
- `components/common/` — shared components (Scanner, StatusBadge, KPICard, EmptyState, Pagination)
- `components/views/` — page-specific components, including `home/` with per-profile home views

**4 user profiles:** `TECNICO_TI`, `SERVIDOR_RESPONSAVEL`, `SERVIDOR_SEMAP`, `GESTOR_ADMIN`

## Key rules

- **Server Components are the default.** Only use `'use client'` for: scanner, interactive forms, bottom sheet, search dropdowns, Recharts charts, notification polling, toasts.
- **All mutations via Server Actions**, never API Routes (only exceptions: `api/auth/[...nextauth]` and `api/health`).
- **AuditLog is immutable** — INSERT only, never UPDATE or DELETE. No `onDelete: Cascade` on AuditLog relations.
- **Validate all inputs with Zod** on both client and server.
- **Server Actions return result objects** `{ success: boolean, data?: T, error?: string }` — never throw for expected errors.
- **SICAM Oracle sync** is the primary channel for loading asset data (`lib/sicam-oracle/`, admin panel `/admin/sicam`). **CSV import is a contingency fallback** — communicate this to SEMAP/operations: CSV should only be used when Oracle connectivity is unavailable.
- **CSV from SICAM** (contingency) uses Latin-1 encoding and `;` delimiter. Parser must handle this explicitly.
- **Email sending is fire-and-forget** — never block the user response. Log errors.
- **Confirmation tokens** generated with `crypto.randomUUID()`, expiry via `TOKEN_EXPIRY_DAYS` env var.
- **Server-side pagination** for all listings (20-50 items). Virtualize lists > 100 items.
- **Debounce 300ms** on search fields.
- Use `import type` for type imports.
- **Rate limiting:** 5 login attempts per `matricula` in 60s; 10 per IP in 15min — in-memory via `lib/rate-limit.ts` (resets on server restart).
- **Node.js minimum:** 20.11+. Oracle Instant Client optional; required for SICAM Oracle thick mode (legacy password verifier) — configure via `ORACLE_CLIENT_PATH`.

## Security headers

Configured in `next.config.ts`:
- **CSP:** `default-src 'self'`; `script-src 'self' 'unsafe-inline'`; `style-src 'self' 'unsafe-inline'` — `unsafe-inline` required for Tailwind 4 (nonces would be ideal but need refactor)
- **X-Frame-Options:** DENY
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin
- **HSTS:** `max-age=31536000` in production only

## Visual identity

- Primary: `#003366` (blue), Secondary: `#2D6E2D` (green)
- Background: `#F2F2F2`, Surfaces: `#FFFFFF`
- Text: `#333333` (primary), `#666666` (secondary)
- Status badges: Pendente `#D4A017`, Confirmada `#003366`, Registrada SICAM `#2D6E2D`, Erro `#CC3333`
- Font: Inter. No gradients.

## Testing

- **Vitest** (jsdom): unit tests in `__tests__/` dirs or `*.test.{ts,tsx}` files. Setup in `vitest.setup.ts`. Path alias `@` resolves to project root.
- **Playwright**: E2E tests in `e2e/` directory. Chromium only. `reuseExistingServer` on port 3000 (dev). 1 retry local / 2 retries CI. `globalSetup` at `e2e/global-setup.ts` seeds test users directly in DB.
- **E2E LDAP bypass:** set `LDAP_URL=""` in test env to skip LDAP and authenticate via DB credentials only.
- Mock LDAP and SMTP in integration tests — never connect to real services.
- Test names in Portuguese, descriptive: `it('deve registrar movimentação com múltiplos tombos')`.

## Delivery waves

- **Onda 1 (Core):** Auth, CSV import (now contingency fallback), scanner, movement registration, email notifications, public confirmation, audit
- **Onda 2 (Operational):** SEMAP backlog, SICAM registration, "my assets" view, admin CRUD, in-app notifications, history; **SICAM Oracle sync (Fase 1 concluída 2026-05-12)** replaces CSV as primary data source
- **Onda 3 (Managerial):** Dashboard KPIs, Recharts charts, audit reports, sync history

## Context files (read before working on a feature)

`context/` holds the authoritative agent context. Read the relevant files before starting any task:

| File | When to read |
|------|-------------|
| [`context/project-overview.md`](context/project-overview.md) | Understanding the product, user flows, in/out of scope |
| [`context/architecture.md`](context/architecture.md) | Stack, folder structure, inviolable architectural rules |
| [`context/build-plan.md`](context/build-plan.md) | Full feature roadmap by phase — what exists, what's next |
| [`context/code-standards.md`](context/code-standards.md) | TypeScript/Next.js conventions, naming, error handling, test patterns |
| [`context/library-docs.md`](context/library-docs.md) | How each library is used *in this project* specifically |
| [`context/ui-tokens.md`](context/ui-tokens.md) | Colors, spacing, typography as CSS variables — source of truth for design tokens |
| [`context/ui-rules.md`](context/ui-rules.md) | Visual behavior: buttons, cards, layout, states |
| [`context/ui-registry.md`](context/ui-registry.md) | Existing component patterns — check before creating new UI; update after adding reusable patterns |
| [`context/progress-tracker.md`](context/progress-tracker.md) | Which features are done vs. pending — update when a feature is completed |

## Detailed docs

See `docs/` for full specifications: PRD.md, UX_UI.md, MVP.md, PLANO_DEV.md, VISUAL_PROMPT.md
