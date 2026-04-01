# PATRIMOVE — Visual Generation Prompt

**Versão 1.0 | Março 2026 | JFAP — Núcleo de TI**

---

## Módulo 1: Tema e Estilo Geral

**Sensação central:** "Limpo, Confiável & Acessível" — Visual institucional sóbrio (cores e tipografia da Justiça Federal) com interface moderna e amigável (componentes shadcn/ui, ilustrações nos estados vazios, microinterações). Transmite seriedade e confiança sem parecer arcaico.

**Inspiração visual:**
- Aplicações governamentais modernas (GOV.UK, Brasil.gov) — clareza, hierarquia, acessibilidade
- Linear.app — limpeza, organização de listas/backlog
- Stripe Dashboard — cards de métricas, gráficos limpos

---

## Módulo 2: Layout e Espaçamento

**Abordagem:** Sidebar colapsável (desktop) + bottom navigation (mobile). Navegação contextual por perfil. Conteúdo centralizado.

**Breakpoints:**

| Breakpoint | Faixa | Layout | Navegação |
|-----------|-------|--------|-----------|
| Mobile | < 768px | Coluna única | Bottom tabs (4 por perfil) + header compacto |
| Tablet | 768-1024px | Grid 2 colunas | Sidebar colapsada (64px) + header |
| Desktop | > 1024px | Grid 2-3 colunas | Sidebar expandida (240px) + header |

**Zonas mobile:** Header (logo + título + sino) → Conteúdo scrollável → FAB → Bottom nav (fixo 64px + safe-area)

**Zonas desktop:** Sidebar (esquerda) → Header (breadcrumb + título + sino + avatar) → Conteúdo (max-width 1280px)

**Bottom tabs por perfil:**

| Perfil | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|--------|-------|-------|-------|-------|
| Técnico TI | Home | Nova Movimentação | Importação CSV | Notificações |
| Servidor Responsável | Meus Patrimônios | Movimentações | Notificações | Perfil |
| Servidor SEMAP | Backlog | Importação CSV | Notificações | Perfil |
| Gestor/Admin | Dashboard | Movimentações | Notificações | Perfil |

**Separação de seções:** Cards com border sutil + shadow-sm. Fundo #F2F2F2, cards brancos. Sem linhas divisórias.

**Espaçamento:**
- Base: múltiplos de 4px (Tailwind)
- Padding página: 16px (mobile), 24px (tablet), 32px (desktop)
- Gap cards: 16px (mobile), 24px (desktop)
- Sidebar: 240px expandida, 64px colapsada
- Bottom nav: 64px + safe-area-inset-bottom
- Header: 56px (mobile), 64px (desktop)
- Max-width: 1280px

---

## Módulo 3: Paleta de Cores

| Token | Hex | CSS Variable | Uso |
|-------|-----|-------------|-----|
| Fundo base | #F2F2F2 | --bg-base | Background de telas |
| Superfície | #FFFFFF | --bg-surface | Cards, modais |
| Texto principal | #333333 | --text-primary | Corpo, headings |
| Texto secundário | #666666 | --text-secondary | Labels, placeholders |
| Azul Institucional | #003366 | --color-primary | Botões primários, sidebar, links, headers |
| Verde Institucional | #2D6E2D | --color-secondary | Sucesso, "Registrada SICAM", H3 |
| Azul Claro | #D6E4F0 | --color-primary-light | Hover, notificações não lidas |
| Amarelo Atenção | #D4A017 | --color-warning | Pendências, atenção |
| Vermelho Erro | #CC3333 | --color-destructive | Erros, ações destrutivas |
| Cinza Claro | #F2F2F2 | --color-muted | Linhas alternadas, separadores |

**Status badges:**
- Pendente Confirmação: fundo #FFF3E0, texto #D4A017
- Confirmada Origem: fundo #D6E4F0, texto #003366
- Registrada SICAM: fundo #E8F5E9, texto #2D6E2D
- Não Confirmada: fundo #FEE2E2, texto #CC3333

**Gradientes:** Nenhum. Visual chapado e institucional.

---

## Módulo 4: Tipografia

| Elemento | Font | Tamanho | Peso | Cor |
|----------|------|---------|------|-----|
| H1 | Inter | 24px / 1.5rem | Bold (700) | #003366 |
| H2 | Inter | 20px / 1.25rem | Semibold (600) | #003366 |
| H3 | Inter | 18px / 1.125rem | Semibold (600) | #2D6E2D |
| Body | Inter | 16px / 1rem | Regular (400) | #333333 |
| Body small | Inter | 14px / 0.875rem | Regular (400) | #666666 |
| Caption / label | Inter | 12px / 0.75rem | Medium (500) | #666666 |
| KPI (números) | Inter | 32px / 2rem | Bold (700) | #333333 |

**Fallback:** Century Gothic, Calibri, sans-serif
**Hierarquia:** Forte, por tamanho + peso + cor. Sem maiúsculas, sem letter-spacing expandido.

---

## Módulo 5: Imagens e Ícones

**Imagens:** Ilustrações SVG simples (flat/outline, cores institucionais). Sem fotos, sem 3D. Logo JF + PATRIMOVE no header/sidebar/login.

**Empty states:**
- Home sem movimentações: "Nenhuma movimentação registrada ainda. Comece escaneando seus tombos!"
- Patrimônios vazio: "Nenhum patrimônio vinculado à sua unidade."
- Backlog vazio: "Tudo em dia! Nenhuma movimentação pendente."

**Ícones (lucide-react):** strokeWidth 2, size 20 (navegação/ações), size 16 (inline)

| Contexto | Ícone |
|----------|-------|
| Scanner | Camera / Scan |
| Movimentação | ArrowRightLeft / Send |
| Notificações | Bell |
| Backlog | ClipboardList |
| Dashboard | BarChart3 |
| Importação CSV | Upload |
| Busca | Search |
| Confirmação | Check / CheckCircle |
| Remover | X |
| Unidades | Building2 |
| Responsáveis | Users |
| Perfil/Config | UserCog / Settings |
| Editar | Pencil |
| Teclado manual | Keyboard |
| Filtros | Filter / SlidersHorizontal |

---

## Módulo 6: Interatividade e Animação

**Hover:** Cards: shadow-sm → shadow-md (150ms). Botões: escurecimento sutil. Links: underline. Tabelas: fundo #D6E4F0.

**Loading:** Skeleton com shimmer. Suspense boundaries independentes (dashboard). Spinner inline para ações.

**Transições:**

| Transição | Animação | Duração |
|----------|----------|---------|
| Navegação entre telas | Slide horizontal (mobile), fade (desktop) | 200ms ease-in-out |
| Bottom sheet | Drag-to-expand, snaps 40%/80% | Gesture-driven |
| Adicionar tombo | Slide-in direita + fade-in | 300ms |
| Remover tombo | Slide-out esquerda + fade-out | 200ms |
| Status chips | Transição de cor | 300ms |
| Tela de sucesso | Check com pulse | 500ms |
| Toasts | Slide-down, fade-out | 3-5s |
| Modal/Sheet | Slide-in + overlay fade | 200ms |

**Botões:** Loading: spinner substituindo texto. Disabled: opacidade 50%. Press mobile: scale 0.98 (100ms).

**Feedback háptico:** Vibração (navigator.vibrate) + som ao detectar código de barras.

---

## Módulo 7: Estrutura de Arquivos

```
app/
  (auth)/login/                  — Login LDAP
  (dashboard)/                   — Layout autenticado
    home/                        — Home contextual por perfil
    movimentacao/nova/           — Scanner + confirmação
    movimentacao/[id]/           — Detalhe
    movimentacao/historico/      — Histórico
    patrimonio/                  — Meus patrimônios
    backlog/                     — Backlog SEMAP
    importacao/                  — Upload CSV
    importacao/historico/        — Histórico importações
    admin/unidades/              — CRUD unidades
    admin/setores/               — CRUD setores
    admin/responsaveis/          — CRUD responsáveis
    admin/perfis/                — CRUD perfis
    dashboard/                   — Dashboard gerencial
    notificacoes/                — Notificações (mobile)
  confirmar/[token]/             — Página pública

components/
  layout/     — AppLayout, Sidebar, BottomNav, Header, PageHeader
  ui/         — shadcn/ui customizados
  common/     — Scanner, EmptyState, StatusBadge, NotificationBell, KPICard, CSVUploader
  views/      — MovimentacaoForm, BacklogList, DashboardCharts, PatrimonioList, AdminTable, etc.

lib/          — types.ts, validations.ts, utils.ts, auth.ts
server/
  actions/    — Server Actions (mutações)
  queries/    — Queries de leitura
  services/   — Email, CSV parser, LDAP, auditoria
prisma/       — Schema, migrations, seed
```

**Regras:** Server Components default. `'use client'` apenas para: scanner, formulários, bottom sheet, dropdowns, gráficos, polling, toasts. Props tipadas com interface. `import type` para tipos.

---

## Módulo 8: Estilo de Componentes

| Componente | Estilo |
|-----------|--------|
| Botão Primário | Fundo #003366, texto branco, rounded-lg, hover: escurecimento |
| Botão Secundário | Borda #003366, fundo transparente, hover: #D6E4F0 |
| Botão Destrutivo | Fundo #CC3333, texto branco |
| Cards | border-gray-200, shadow-sm, rounded-lg, branco, hover: shadow-md, padding 16/24px |
| Inputs | Padrão shadcn, ícone esquerda, erro: borda vermelha, foco: ring azul |
| DataTable | Header #003366 branco, linhas alternadas, hover #D6E4F0, texto 14px |
| Sheet/Modal | Lateral 480px (desktop), fullscreen (mobile), overlay escuro, slide-in 200ms |
| Status Badge | Pendente: #FFF3E0/#D4A017, Confirmada: #D6E4F0/#003366, SICAM: #E8F5E9/#2D6E2D |
| Toast (Sonner) | 4 variantes (success/error/warning/info), topo mobile, canto desktop |
| Bottom Nav | Branco, border-top, ativo #003366+bold, inativo #666666, 64px+safe-area |
| Sidebar | Fundo #003366, itens brancos, ativo: branco 15%, logo topo, avatar inferior |
| Dropdown Busca | Combobox shadcn, "Buscar unidade...", empty state |
| Stepper CSV | 3 etapas, ativa: azul, concluída: verde+check, futura: cinza |
| Empty State | SVG flat/outline + mensagem amigável + CTA opcional |

---

## Módulo 9: Páginas do MVP

### 9.1 Login — `/login`
Sem AppLayout. Card centralizado: logo JF + PATRIMOVE, matrícula, senha, "Entrar". Estados: inicial, carregando, erro credenciais, erro LDAP.

### 9.2 Home Técnico — `/home`
AppLayout. Saudação + sino. CTA "Nova Movimentação" (card grande). 3 KPI cards. Lista movimentações recentes. Empty state.

### 9.3 Scanner — `/movimentacao/nova`
AppLayout. **Mobile:** scanner 60% (viewfinder + guia + overlay) → "Digitar manualmente" → bottom sheet 40% (lista tombos, swipe-delete, badge, botão Avançar). **Desktop:** 2 colunas.

### 9.4 Confirmação — `/movimentacao/nova` (etapa 2)
AppLayout. Card Origem→Destino, dropdown destino, lista tombos, info auto, Confirmar + Voltar. Pós: check animado.

### 9.5 Detalhe — `/movimentacao/[id]`
AppLayout. Dados completos, timeline status, lista tombos, auditoria. Todos os perfis.

### 9.6 Confirmação Pública — `/confirmar/[token]`
Sem AppLayout. Header simples logo. Card: tombos, origem→destino, técnico, data. "Confirmar Saída" → modal. Estados: válido, expirado, já confirmado.

### 9.7 Importação CSV — `/importacao`
AppLayout. Stepper 3 etapas: upload (drag-drop) → pré-visualização (resumo + tabela + erros) → confirmação (progresso + resumo final). Acesso: TI e SEMAP.

### 9.8 Meus Patrimônios — `/patrimonio`
AppLayout. Unidade atual, alerta pendências, busca (debounce 300ms), chips filtro, lista patrimônios. Empty state.

### 9.9 Backlog SEMAP — `/backlog`
AppLayout. Filtros (status, período, unidade, limpar), ordenação, cards modulares, botão "Registrar no SICAM" (só se Confirmada), paginação. Empty state.

### 9.10 Registro SICAM — Sheet do backlog
Sheet lateral 480px / fullscreen. Dados (readonly), Nº Protocolo, Data Registro, Observações, Confirmar + Cancelar.

### 9.11 CRUD Admin — `/admin/*`
AppLayout. DataTable + busca + "Novo", sheet criação/edição + Zod, desativar (sem deletar), tabs entre entidades. Acesso: Gestor/Admin e SEMAP.

### 9.12 Notificações — Popover (desktop) / `/notificacoes` (mobile)
Lista cronológica, ícone por tipo, data relativa, lida/não lida, "Marcar todas". Badge sino.

### 9.13 Histórico — `/movimentacao/historico`
AppLayout. DataTable filtros completos, paginação server-side, link para detalhe. Todos os perfis.

### 9.14 Dashboard — `/dashboard`
AppLayout. 3 KPIs (tempo médio, pendentes SICAM, pendentes confirmação). Gráfico Recharts (período). Visão por unidade. Tabela auditoria (filtros + paginação). Suspense + skeleton por seção.

### 9.15 Histórico CSV — `/importacao/historico`
AppLayout. Tabela: quem, quando, arquivo, novos, atualizados, erros. Acesso: TI e SEMAP.

---

## Módulo 10: Notas Técnicas

**Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Prisma, NextAuth v5, Zod, @zxing/library, Nodemailer, Recharts, TanStack Table, lucide-react, Docker Compose.

**Renderização:** RSC default. Client apenas para interatividade. Server Actions para mutações. Streaming/Suspense para dashboard.

**Responsividade:** Mobile-first. Breakpoints: <768, 768-1024, >1024. Chrome Android + Safari iOS + Chrome Desktop.

**Acessibilidade WCAG 2.1 AA:** aria-labels, teclado completo, focus trap, focus visible 2px, contraste ≥4.5:1, toque ≥44x44px, aria-live em toasts, alternativa manual para scanner.

**Variáveis de ambiente:** DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD, LDAP_SEARCH_BASE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, APP_URL, TOKEN_EXPIRY_DAYS.
