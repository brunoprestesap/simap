# PATRIMOVE — Plano de Desenvolvimento do MVP

**Versão 1.0 | Março 2026 | JFAP — Núcleo de TI**

---

## 1. Objetivo

Construir, testar e implantar o PATRIMOVE em produção para todas as 50+ unidades da JFAP, com escopo completo em 3 ondas progressivas, usando Claude Code e testes automatizados robustos.

### Critérios de Aceite

1. Todas as funcionalidades das 3 ondas implementadas e testadas
2. Testes automatizados com cobertura ≥ 80% nos fluxos críticos
3. Importação CSV processando ~12.000 registros corretamente
4. Scanner Code 128 funcionando em Chrome/Safari (Android/iOS)
5. Autenticação LDAP/AD integrada
6. E-mails via SMTP funcional
7. Aplicação containerizada em Docker na VPS interna

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Framework | Next.js 16 + TypeScript | SSR/RSC, Server Actions; stack unificada |
| UI | Tailwind CSS + shadcn/ui | Utility-first; componentes acessíveis |
| Banco | PostgreSQL 16 via Prisma | Type-safe, migrations; RNF-08 |
| Auth | NextAuth.js v5 | LDAP/AD provider; sessão JWT |
| Scanner | @zxing/library | Code 128; getUserMedia; leve |
| E-mail | Nodemailer | SMTP nativo; templates HTML |
| Gráficos | Recharts | React-native; responsivo |
| Tabelas | TanStack Table | Filtros, ordenação, paginação server-side |
| Validação | Zod | Schema validation; Server Actions |
| Testes | Vitest + Playwright | Unitários/integração + E2E |
| Deploy | Docker Compose | app + PostgreSQL 16; VPS interna |

### Stack de Testes

| Tipo | Ferramenta | Escopo | Cobertura |
|------|-----------|--------|-----------|
| Unitários | Vitest | Parser CSV, validações, KPIs, tokens | 90%+ funções de utilidade |
| Integração | Vitest + Testing Library | API Routes, Server Actions, middleware, CRUD | 80%+ endpoints |
| E2E | Playwright | Fluxos completos | 100% dos 7 fluxos críticos |
| Linting | ESLint + TypeScript strict | Qualidade de código | 100% |

---

## 3. Roadmap — Fases de Desenvolvimento

### Fase 0 — Setup & Fundação

| # | Tarefa | Dependência |
|---|--------|------------|
| 0.1 | Inicializar Next.js 16 + TypeScript + Tailwind + shadcn/ui | — |
| 0.2 | Configurar Docker Compose (Next.js + PostgreSQL) | 0.1 |
| 0.3 | Configurar Prisma ORM + conexão PostgreSQL | 0.2 |
| 0.4 | Modelagem completa do banco (Tombo, Unidade, Setor, Servidor, Movimentacao, ItemMovimentacao, AuditLog, Notificacao, ImportacaoCSV, Usuario) | 0.3 |
| 0.5 | Seed de dados de teste | 0.4 |
| 0.6 | Configurar Vitest + Playwright | 0.1 |
| 0.7 | Layout base responsivo (sidebar + bottom nav + header) | 0.1 |
| 0.8 | Tema institucional (paleta JF, tipografia, shadcn) | 0.7 |

### Onda 1 — Core (Registro + Comunicação)

| # | Tarefa | Dependência |
|---|--------|------------|
| 1.1 | Autenticação LDAP/AD com NextAuth v5 | 0.4 |
| 1.2 | Importação CSV do SICAM (3 etapas) | 1.1 |
| 1.3 | Scanner Code 128 + input manual | 1.1, 1.2 |
| 1.4 | Registro de movimentação (seleção destino, confirmação) | 1.3 |
| 1.5 | Envio de e-mails SMTP (templates origem + destino) | 1.4 |
| 1.6 | Página pública de confirmação (token) | 1.5 |
| 1.7 | Home do Técnico de TI | 1.4 |
| 1.8 | Registro de auditoria (imutável) | 1.4 |
| 1.9 | Testes Onda 1 | 1.1-1.8 |

### Onda 2 — Operacional (SEMAP + Patrimônios + Admin)

| # | Tarefa | Dependência |
|---|--------|------------|
| 2.1 | Backlog SEMAP (filtros, ordenação, paginação) | Onda 1 |
| 2.2 | Formulário registro SICAM (protocolo, data, obs.) | 2.1 |
| 2.3 | Meus Patrimônios (busca, filtros) | Onda 1 |
| 2.4 | CRUD Admin: Unidades e Setores | Onda 1 |
| 2.5 | CRUD Admin: Servidores Responsáveis | 2.4 |
| 2.6 | CRUD Admin: Perfis de Acesso | 2.4 |
| 2.7 | Central de notificações in-app | Onda 1 |
| 2.8 | Histórico de movimentações + detalhe | Onda 1 |
| 2.9 | Testes Onda 2 | 2.1-2.8 |

### Onda 3 — Gerencial (Dashboard + Relatórios)

| # | Tarefa | Dependência |
|---|--------|------------|
| 3.1 | Dashboard: 3 KPIs principais | Onda 2 |
| 3.2 | Dashboard: gráfico movimentações/período (Recharts) | 3.1 |
| 3.3 | Dashboard: visão por unidade | 3.1 |
| 3.4 | Dashboard: tabela relatórios de auditoria | 3.1 |
| 3.5 | Histórico de importações CSV | Onda 2 |
| 3.6 | Testes Onda 3 | 3.1-3.5 |

### Fase Final — Testes, Hardening & Deploy

| # | Tarefa | Dependência |
|---|--------|------------|
| F.1 | Teste de carga (~12.000 tombos, ~300 mov.) | Onda 3 |
| F.2 | Compatibilidade mobile (Chrome Android + Safari iOS) | Onda 3 |
| F.3 | Integração LDAP/AD com usuários reais | Onda 3 |
| F.4 | Envio de e-mail com SMTP real | Onda 3 |
| F.5 | Importação CSV real (~12.000 tombos) | F.1 |
| F.6 | Hardening segurança (headers, rate limiting, tokens, HTTPS) | F.1 |
| F.7 | Backup automatizado (pg_dump cron diário) | F.1 |
| F.8 | Deploy produção na VPS (Docker + Nginx/HTTPS) | F.1-F.7 |
| F.9 | Smoke test em produção | F.8 |

**Total: 41 tarefas**

---

## 4. Fluxos E2E Críticos

| # | Fluxo | Onda |
|---|-------|------|
| E2E-01 | Login LDAP → redirecionamento por perfil | 1 |
| E2E-02 | Importação CSV completa (3 etapas) | 1 |
| E2E-03 | Nova movimentação: scanner → destino → confirmação | 1 |
| E2E-04 | Confirmação pública via token | 1 |
| E2E-05 | Backlog SEMAP → registro no SICAM | 2 |
| E2E-06 | CRUD admin (unidades, setores, responsáveis, perfis) | 2 |
| E2E-07 | Dashboard carrega com dados | 3 |

---

## 5. Infraestrutura de Deploy

| Componente | Configuração |
|-----------|-------------|
| Servidor | VPS interna JFAP (Docker instalado) |
| Containers | Docker Compose: app (Next.js standalone) + db (PostgreSQL 16) |
| Reverse Proxy | Nginx ou Caddy (HTTPS) |
| Backup | pg_dump diário, retenção 30 dias |
| Ambiente | Único (produção) |

---

## 6. Riscos e Mitigação

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Scanner não funciona em dispositivos específicos | Média | Alto | Input manual obrigatório; testes em dispositivos reais |
| LDAP/AD indisponível ou config diferente | Baixa | Alto | Testar cedo (1.1); fallback para dev local |
| CSV muda formato sem aviso | Média | Médio | Parser robusto; validação de headers; pré-visualização |
| Baixa adoção pelos técnicos | Média | Alto | Comunicação institucional; interface intuitiva |
| Responsáveis não confirmam (ignoram e-mail) | Média | Médio | Prazo + flag "Não confirmada"; notificações in-app |
| Performance com 12.000 tombos | Baixa | Médio | Índices; paginação; virtualização; teste de carga |
| Bug em deploy afeta todos (ambiente único) | Média | Alto | Testes robustos; smoke test; rollback via Docker |
| SMTP bloqueia e-mails automatizados | Baixa | Alto | Testar cedo; remetente institucional; fallback in-app |

---

## 7. Decisões Pendentes

| # | Questão | Onda | Recomendação |
|---|---------|------|-------------|
| QA-01 | Prazo para confirmação da origem | 1 | 5 dias úteis; segue com "Não confirmada" |
| QA-02 | Validade dos tokens | 1 | 7 dias |
| QA-03 | CSV: upsert ou substituição | 1 | Upsert por Nº Tombo |
| QA-04 | Tombos baixados no SICAM | 2 | Marcar "Baixado" sem excluir |

---

## 8. Pós-MVP

| Fase | Funcionalidade | Gatilho |
|------|---------------|---------|
| Fase 2 | Relatórios PDF | Demanda do gestor |
| Fase 2 | Inventário físico com código de barras | Base consolidada |
| Fase 2 | Ambiente de homologação | Frequência de deploys |
| Fase 3 | Integração SICAM via API | TRF1 disponibilizar |
| Futura | Modo offline | Demanda em locais sem rede |
| Futura | PWA / App nativo | Limitações do navegador |
