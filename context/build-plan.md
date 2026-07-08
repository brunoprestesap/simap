# Build Plan — PATRIMOVE (SIMAP)

Roadmap completo dividido em ondas e features sequenciadas. Cada feature é atômica, delimitada e testável de forma independente. O agente lê este arquivo para saber o que vem a seguir — nunca decide sozinho.

---

## Onda 1 — Core (concluída)

### F-01 Autenticação LDAP/AD ✅
- Login via Credentials (NextAuth v5)
- Autenticação contra LDAP/AD institucional
- Provisão automática de usuário no 1º login
- Rate limiting: 5 tentativas/matrícula/60s, 10/IP/15min
- JWT com campos customizados: `id`, `matricula`, `nome`, `perfil`
- Revalidação periódica de perfil e status ativo

### F-02 Scanner de código de barras ✅
- Câmera via `html5-qrcode`
- Aceita códigos de barra e QR
- Fallback para digitação manual
- Componente `Scanner` reutilizável em `components/common/`

### F-03 Registro de movimentação ✅
- Wizard: seleção de tombos → destino (unidade/setor) → revisão → confirmar
- Multi-seleção de tombos via scanner ou busca
- Criação de `Movimentacao` + `ItemMovimentacao[]`
- Geração de token de confirmação (UUID, expira em `TOKEN_EXPIRY_DAYS`)
- Auditoria automática do evento

### F-04 Notificação por e-mail ✅
- E-mail fire-and-forget ao responsável de destino
- Templates HTML: saída, entrada, confirmação
- Nodemailer com SMTP configurável
- Timeout de 5s (connect) / 10s (send)

### F-05 Confirmação pública de recebimento ✅
- Página `/confirmar/[token]` sem autenticação
- Validação de token + expiração
- Status → `CONFIRMADA_DESTINO`
- Notificação in-app criada para SEMAP

### F-06 Auditoria imutável ✅
- `AuditLog` INSERT-only para toda ação crítica
- Registro de: quem, quando, o quê, sobre qual entidade
- Sem onDelete Cascade — registros são permanentes

### F-07 Importação CSV (contingência) ✅
- Upload de arquivo CSV do SICAM (Latin-1, delimitador `;`)
- Parser com tratamento de encoding
- Upsert de tombos (novos + atualizados + erros)
- Histórico de importações com contadores
- Exclusivo para `SERVIDOR_SEMAP` e `GESTOR_ADMIN`

---

## Onda 2 — Operacional (majoritariamente concluída)

### F-08 Backlog SEMAP ✅
- Lista de movimentações `CONFIRMADA_DESTINO` aguardando registro
- Filtros por unidade, período, tombo
- Paginação server-side

### F-09 Registro no SICAM ✅
- Sheet lateral com campos: protocolo SICAM, observações
- Status → `REGISTRADA_SICAM`
- Registra `protocoloSicam`, `dataRegistroSicam`, `registradoSicamPorId`
- Notificação in-app para o técnico TI que abriu a movimentação

### F-10 Vista "meus patrimônios" (Responsável) ✅
- Tombos do servidor logado (por `matriculaResponsavel`)
- Página `/patrimonio` e `/meus-tombos`
- Cards com status e histórico de movimentações

### F-11 Administração CRUD ✅
- CRUD de Unidades (código + descrição + ativo)
- CRUD de Setores (código + nome + unidade + ativo)
- CRUD de Usuários (matrícula + perfil + unidade + setor)
- Gestão de Responsáveis (vinculação tombo ↔ usuário)
- Restrito a `SERVIDOR_SEMAP` e `GESTOR_ADMIN`

### F-12 Notificações in-app ✅
- Tipos: `SAIDA_TOMBO`, `ENTRADA_TOMBO`, `CONFIRMACAO_REALIZADA`, `REGISTRO_SICAM`, `IMPORTACAO_CSV`
- Bell com badge de não lidas no header
- Página `/notificacoes` com paginação
- Marcar como lida / deletar
- Polling client-side (`NotificationBell`)

### F-13 Histórico de movimentações ✅
- Página `/movimentacao/historico`
- Filtros avançados: status, unidade, período, tombo
- Timeline de status por movimentação
- Acesso para TI, SEMAP e Admin

### F-14 Sincronização Oracle SICAM — Fase 1 (infra + UI admin) ✅ (2026-05-12)
- Cliente Oracle (`lib/sicam-oracle/`) com pool de conexões
- Health check da conexão Oracle
- Painel `/admin/sicam`: status da conexão, disparar sync manual, histórico de sincronizações
- Sync popula `Tombo` e `HistoricoTermoSicam` via upsert
- Modelo `SincronizacaoSicam` com status `EM_ANDAMENTO | CONCLUIDA | ERRO`
- Timeout dedicado de 600s no Nginx para a rota de sync

### F-15 Movimentações em lote ✅
- Página `/movimentacao/lote` para `SERVIDOR_RESPONSAVEL` e `SERVIDOR_SEMAP`
- Seleção múltipla de tombos para movimentação agrupada

### F-16 Consulta de tombos (catálogo) ✅
- Página `/tombos` com busca full-text por número, descrição, responsável
- Detalhe `/tombos/[id]` com histórico SICAM e movimentações

---

## Onda 3 — Gerencial (em desenvolvimento)

### F-17 Dashboard KPIs ⬜
- Página `/dashboard` (GESTOR_ADMIN)
- KPIs: total tombos, movimentações no período, pendentes de confirmação, registradas SICAM
- Comparação com período anterior (percentual de variação)
- Componentes `DashboardKPIs`, `KPICard`

### F-18 Gráficos de movimentação ⬜
- Recharts: movimentações por mês (bar chart)
- Movimentações por unidade (bar chart horizontal)
- Status distribution (pie ou donut)
- Componente `DashboardChart` com `'use client'`

### F-19 Relatório de auditoria ⬜
- Tabela paginada de `AuditLog` com filtros: ação, entidade, usuário, período
- Componente `DashboardAuditoria`
- Restrito a `GESTOR_ADMIN`

### F-20 Histórico de sincronizações SICAM ⬜
- Lista de `SincronizacaoSicam` com stats detalhados
- Erro expandível com `mensagemErro`
- Já parcialmente implementado no painel `/admin/sicam`

### F-21 Sincronização Oracle SICAM — Fase 2 (sync automático) ⬜
- Cron job interno ou via deploy para sync periódico (ex: diário às 2h)
- Diferencial: sincronizar apenas tombos alterados desde último sync
- Alerta automático em caso de falha na conexão Oracle

### F-22 Sincronização Oracle SICAM — Fase 3 (histórico completo) ⬜
- Sync completo de `HistoricoTermoSicam` (todos os termos, não só o atual)
- Exibição do histórico de responsáveis na tela de detalhe do tombo

### F-23 Sincronização Oracle SICAM — Fase 4 (escrita) ⬜
- Registro de movimentação diretamente no Oracle SICAM via API/proc
- Eliminação do passo manual do SEMAP para casos de integração completa

---

## Backlog técnico

### T-01 CSP com nonces ⬜
- Remover `unsafe-inline` de script-src usando nonces via middleware
- Requer refatoração do next.config.ts + middleware.ts

### T-02 Sync automático agendado ⬜
- Integração com cron ou task scheduler na VPS

### T-03 Node.js 24 LTS ⬜
- Upgrade do Dockerfile (atualmente Node 20)

### T-04 Cert PKI TRF-1 ⬜
- Substituir cert self-signed por certificado da CA institucional

### T-05 Docker image com SHA tag ⬜
- Eliminar tag `latest` em produção, usar SHA do commit

### T-06 Prisma CLI em staging ⬜
- Pipeline de migrate deploy em ambiente staging antes de produção
