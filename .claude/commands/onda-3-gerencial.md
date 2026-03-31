# Onda 3 — Gerencial (Dashboard + Relatórios)

Implemente o dashboard gerencial e relatórios. Ondas 1 e 2 já estão completas. Consulte @CLAUDE.md e @docs/VISUAL_PROMPT.md.

## Tarefas (executar em ordem)

### 3.1 — Dashboard: KPIs Principais
- Crie `app/(dashboard)/dashboard/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.14
- Crie `components/views/DashboardKPIs.tsx` (Server Component com Suspense boundary):
  - 3 KPI cards em destaque, empilham no mobile:
    1. **Tempo médio de registro no SICAM**: número grande (ex.: "4,2 dias") + indicador de tendência (seta up/down comparando com período anterior). Calcule: média de (dataRegistroSicam - createdAt) das movimentações REGISTRADA_SICAM no período
    2. **Pendentes de registro no SICAM**: contador + borda amarela + link "Ver backlog" (navega para /backlog?status=CONFIRMADA_ORIGEM)
    3. **Pendentes de confirmação**: contador + borda azul
- Crie `components/common/KPICard.tsx`: card reutilizável com valor grande, label, tendência (opcional), link (opcional), cor de borda
- Crie `server/queries/dashboard.ts`: queries otimizadas para KPIs com aggregations do Prisma (count, avg)
- Use Suspense + Skeleton para loading independente de cada KPI

### 3.2 — Dashboard: Gráfico de Movimentações por Período
- Crie `components/views/DashboardChart.tsx` ('use client'):
  - Gráfico Recharts (BarChart ou LineChart) responsivo
  - Seletor de período: dia, semana, mês (tabs ou dropdown)
  - Eixo X: datas do período. Eixo Y: quantidade de movimentações
  - Tooltip com detalhes ao hover
  - Cores: barras em #003366
- Crie `server/queries/dashboard.ts` (adicionar): query que agrupa movimentações por dia/semana/mês usando groupBy do Prisma
- Wrap com Suspense + Skeleton

### 3.3 — Dashboard: Visão por Unidade
- Crie `components/views/DashboardUnidades.tsx`:
  - Tabela ou gráfico de barras horizontais (Recharts)
  - Mostra distribuição de movimentações por unidade organizacional
  - Colunas: unidade, total movimentações, pendentes, registradas
  - Ordenável por cada coluna
- Query em `server/queries/dashboard.ts`: groupBy por unidadeOrigemId com count por status

### 3.4 — Dashboard: Relatórios de Auditoria
- Crie `components/views/DashboardAuditoria.tsx`:
  - DataTable (TanStack Table) com filtros:
    - Período (date range picker)
    - Unidade (dropdown com busca)
    - Responsável (dropdown com busca)
    - Status (dropdown)
  - Colunas: data, nº movimentação, origem → destino, técnico, status, confirmado por, protocolo SICAM
  - Paginação server-side (20 itens por página)
  - Filtros persistidos em URL search params
- Crie `server/queries/auditoria.ts`: query com filtros compostos, joins, paginação

### 3.5 — Histórico de Importações CSV
- Crie `app/(dashboard)/importacao/historico/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.15
- Tabela simples com colunas: data, importado por (nome), arquivo, registros novos, atualizados, erros
- Dados da tabela ImportacaoCSV
- Acesso: Técnico TI e SEMAP

### 3.6 — Testes da Onda 3
- **Unitários:** cálculos de KPIs (tempo médio, contagens), aggregations, formatação de dados para gráficos
- **Integração:** queries do dashboard (KPIs retornam dados corretos), query de auditoria com filtros
- **E2E (Playwright):** Dashboard carrega com dados mockados, KPIs exibem valores, gráfico renderiza, filtros de auditoria funcionam

## Critério de conclusão da Onda 3
- [ ] Dashboard com 3 KPIs calculados corretamente
- [ ] Gráfico de movimentações por período funcional e responsivo
- [ ] Visão por unidade com dados reais
- [ ] Tabela de auditoria com filtros e paginação
- [ ] Histórico de importações CSV
- [ ] Suspense + Skeleton em cada seção do dashboard
- [ ] Todos os testes passando
