# SIMAP (Patrimove)

Sistema web de movimentação e acompanhamento patrimonial da JFAP.

Este README é focado em **onboarding técnico** para desenvolvimento local.

## TL;DR (subir em 5 minutos)

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App em `http://localhost:3000`.

## Stack e versões

- Next.js 16 + App Router + TypeScript strict
- React 19
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + PostgreSQL 16
- NextAuth v5 (LDAP/AD)
- Zod (validação)
- Vitest + Testing Library + Playwright

## Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 16 local **ou** Docker

## Variáveis de ambiente

Use `.env.example` como base:

```bash
cp .env.example .env
```

Se você também usa `.env.local`, ele tem precedência sobre `.env` no Next.js. Em desenvolvimento local padrão, mantenha `NEXTAUTH_URL` e `APP_URL` como `http://localhost:3000` para evitar redirecionamentos para outro host.

Mínimas para rodar local:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (em dev, use `http://localhost:3000`)

As integrações de LDAP/SMTP podem usar valores de ambiente local/mock durante desenvolvimento, conforme sua infraestrutura.

## Setup local (detalhado)

1. Instalar dependências:

```bash
npm install
```

2. Configurar ambiente:

```bash
cp .env.example .env
```

3. Subir banco (se necessário) e aplicar schema:

```bash
npx prisma migrate dev
```

4. Popular dados iniciais:

```bash
npx prisma db seed
```

5. Rodar aplicação:

```bash
npm run dev
```

## Setup com Docker

```bash
docker compose up -d
```

Depois, rode migrations/seed normalmente no host:

```bash
npx prisma migrate dev
npx prisma db seed
```

## Scripts de desenvolvimento

- `npm run dev`: inicia Next.js em modo dev (Turbopack)
- `npm run build`: build de produção
- `npm run start`: start da build de produção
- `npm run lint`: lint do projeto
- `npm run test`: testes unitários/integrados (Vitest)
- `npm run test:watch`: testes em modo watch
- `npm run test:e2e`: testes end-to-end (Playwright)

## Estrutura de diretórios

```text
app/          rotas, layouts e páginas (App Router)
components/   componentes de UI, layout e telas
lib/          tipos, validações, auth e utilitários
server/       regras de negócio no servidor
  actions/    mutações (Server Actions)
  queries/    leituras
  services/   e-mail, auditoria, parser CSV
prisma/       schema, migrations e seed
docs/         documentação funcional e técnica
```

## Convenções arquiteturais (importante)

- Server Components por padrão
- Use `'use client'` apenas quando houver interatividade/browsers APIs
- Toda mutação deve ficar em **Server Actions** (não usar API Route para mutação)
- Validar entrada com Zod no client e no server
- Auditoria é imutável (somente `INSERT`)

## Fluxo funcional resumido

1. TI registra movimentação e escaneia tombos
2. Sistema envia e-mails para origem/destino
3. Responsável da origem confirma por link público com token
4. Item entra no backlog da SEMAP
5. SEMAP registra no SICAM e conclui

## Testes e qualidade

```bash
npm run lint
npm run test
npm run test:e2e
```

Recomendado antes de abrir PR.

## Troubleshooting rápido

- **Erro de conexão com banco:** valide `DATABASE_URL` e se o Postgres está ativo
- **Falha no Prisma Client:** rode `npx prisma migrate dev` novamente
- **Login não funciona:** revise variáveis LDAP e `NEXTAUTH_SECRET`
- **Porta 3000 em uso:** rode com outra porta (`npm run dev -- -p 3001`)

## Documentação complementar

- `docs/PRD.md`
- `docs/UX_UI.md`
- `docs/MVP.md`
- `docs/PLANO_DEV.md`
- `docs/VISUAL_PROMPT.md`
