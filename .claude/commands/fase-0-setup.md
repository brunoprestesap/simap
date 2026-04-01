# Fase 0 — Setup & Fundação

Inicialize o projeto SIMAP do zero. Siga as specs em @CLAUDE.md e consulte @docs/VISUAL_PROMPT.md para design tokens.

## Tarefas (executar em ordem)

### 0.1 — Inicializar Next.js
- Crie o projeto Next.js 16 com TypeScript strict, Tailwind CSS, App Router
- Configure ESLint, Prettier
- Instale as dependências: shadcn/ui, lucide-react, @zxing/library, nodemailer, recharts, @tanstack/react-table, zod, next-auth@beta (v5), @prisma/client, prisma
- Instale as dependências de dev: vitest, @testing-library/react, @testing-library/jest-dom, playwright, @vitejs/plugin-react
- Configure os scripts no package.json: dev, build, lint, test, test:e2e
- Configure tsconfig com strict: true e paths aliases (@/ para o root)

### 0.2 — Docker Compose
- O docker-compose.yml já existe na raiz. Verifique que está correto.
- Ajuste o Dockerfile para a versão correta do Next.js 16 com output: 'standalone' no next.config.ts
- Teste que `docker compose up db -d` sobe o PostgreSQL corretamente

### 0.3 — Prisma ORM
- Inicialize o Prisma: `npx prisma init`
- Configure o datasource para PostgreSQL usando DATABASE_URL do .env
- Habilite o Prisma Client com previewFeatures se necessário

### 0.4 — Modelagem do Banco de Dados
Crie o schema Prisma completo com TODAS as tabelas necessárias para as 3 ondas. Siga as regras em .claude/rules/prisma.md e consulte o domínio em .claude/skills/patrimove-domain/SKILL.md.

Tabelas necessárias:

**Unidade** — id, codigo (unique), descricao, ativo, createdAt, updatedAt

**Setor** — id, codigo (unique), nome, unidadeId (FK), ativo, createdAt, updatedAt

**Servidor** — id, matricula (unique), nome, email (nullable, obtido via LDAP), unidadeId (FK), ativo, createdAt, updatedAt

**Tombo** — id, numero (unique, string), descricaoMaterial, codigoFornecedor, nomeFornecedor, unidadeId (FK), setorId (FK nullable), servidorResponsavelId (FK), saida (string nullable), ativo, createdAt, updatedAt

**Usuario** — id, matricula (unique), nome, perfil (enum: TECNICO_TI, SERVIDOR_RESPONSAVEL, SERVIDOR_SEMAP, GESTOR_ADMIN), ativo, createdAt, updatedAt

**Movimentacao** — id, codigo (unique, auto-gerado), unidadeOrigemId (FK), unidadeDestinoId (FK), tecnicoId (FK → Usuario), status (enum: PENDENTE_CONFIRMACAO, CONFIRMADA_ORIGEM, REGISTRADA_SICAM, NAO_CONFIRMADA), tokenConfirmacao (unique, string), tokenExpiraEm (DateTime), confirmadoEm (DateTime nullable), confirmadoPorNome (string nullable), protocoloSicam (string nullable), dataRegistroSicam (DateTime nullable), observacoesSicam (string nullable), registradoSicamPorId (FK → Usuario nullable), createdAt, updatedAt

**ItemMovimentacao** — id, movimentacaoId (FK), tomboId (FK), createdAt

**AuditLog** — id, acao (string), entidade (string), entidadeId (string), usuarioId (FK → Usuario nullable), detalhes (Json nullable), createdAt (somente, sem updatedAt)

**Notificacao** — id, tipo (enum: SAIDA_TOMBO, ENTRADA_TOMBO, CONFIRMACAO_REALIZADA, REGISTRO_SICAM, IMPORTACAO_CSV), titulo, mensagem, link (string nullable), usuarioDestinoId (FK → Usuario), lida (boolean default false), createdAt, updatedAt

**ImportacaoCSV** — id, nomeArquivo, totalRegistros, novos, atualizados, erros, importadoPorId (FK → Usuario), createdAt

Adicione os enums: PerfilUsuario, StatusMovimentacao, TipoNotificacao.
Adicione índices (@@index) em: Tombo.numero, Tombo.unidadeId, Servidor.matricula, Movimentacao.status, Movimentacao.tokenConfirmacao, Movimentacao.createdAt, Notificacao.usuarioDestinoId, Notificacao.lida.
Adicione as relações (relations) corretas entre todas as tabelas.

Rode `npx prisma migrate dev --name init` para criar a migration inicial.

### 0.5 — Seed de dados
Crie `prisma/seed.ts` com dados fictícios realistas:
- 5 unidades organizacionais (ex.: "Secretaria da 1ª Vara", "Núcleo de TI", etc.)
- 2-3 setores por unidade
- 10 servidores (com matrículas estilo "AP20154")
- 50 tombos distribuídos entre as unidades
- 4 usuários (1 de cada perfil)
- 5 movimentações em diferentes status
- 10 notificações
Configure no package.json: `"prisma": { "seed": "tsx prisma/seed.ts" }`
Instale tsx como devDependency.

### 0.6 — Configurar Testes
- Configure vitest.config.ts com ambiente jsdom, aliases, setup files
- Configure playwright.config.ts com browsers chromium e webkit
- Crie um teste unitário de exemplo em `lib/__tests__/utils.test.ts`
- Crie um teste E2E de exemplo em `e2e/health.spec.ts` que verifica se o app sobe

### 0.7 — Layout Base Responsivo
Crie o layout base da aplicação seguindo @docs/VISUAL_PROMPT.md (Módulos 2 e 8):

**components/layout/AppLayout.tsx** — Layout principal autenticado:
- Sidebar (desktop ≥768px) + BottomNav (mobile <768px) + Header + conteúdo
- Renderiza a navegação contextual por perfil do usuário

**components/layout/Sidebar.tsx** — Sidebar desktop:
- Fundo #003366, largura 240px (expandida) / 64px (colapsada)
- Logo SIMAP no topo
- Itens de navegação com ícones lucide-react e labels (brancos)
- Item ativo com fundo branco 15% opacidade
- Avatar + nome do usuário na parte inferior
- Botão para colapsar/expandir

**components/layout/BottomNav.tsx** — Bottom navigation mobile:
- Fundo branco, border-top sutil, height 64px + safe-area
- 4 tabs contextuais por perfil (conforme @docs/VISUAL_PROMPT.md Módulo 2)
- Ativo: #003366 + label bold. Inativo: #666666

**components/layout/Header.tsx** — Header:
- Mobile: logo reduzido + título da tela + sino de notificações
- Desktop: breadcrumb + título + sino + avatar

**components/common/NotificationBell.tsx** — Ícone sino com badge numérico (placeholder, dados mockados por enquanto)

### 0.8 — Tema Institucional
Configure o tema visual da Justiça Federal:
- `app/globals.css`: CSS variables com todos os design tokens do @docs/VISUAL_PROMPT.md Módulo 3
- Configure shadcn/ui com as cores institucionais (primary: #003366, secondary: #2D6E2D, destructive: #CC3333, etc.)
- Fonte Inter via next/font/google com fallback Century Gothic, Calibri, sans-serif
- Crie `app/(auth)/layout.tsx` (layout sem sidebar, para login)
- Crie `app/(dashboard)/layout.tsx` (layout com AppLayout)
- Crie `app/confirmar/layout.tsx` (layout público simples com logo)

## Critério de conclusão da Fase 0
- [ ] `npm run dev` roda sem erros
- [ ] `npx prisma migrate dev` cria todas as tabelas
- [ ] `npx prisma db seed` popula dados de teste
- [ ] Layout responsivo funciona (sidebar desktop, bottom nav mobile)
- [ ] Tema institucional aplicado (cores, fonte, shadcn customizado)
- [ ] `npm run test` roda o teste de exemplo
- [ ] Docker Compose sobe o banco corretamente
