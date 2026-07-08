# Progress Tracker — PATRIMOVE (SIMAP)

Atualizado automaticamente a cada feature concluída. Ler este arquivo no início de cada sessão para saber onde a build parou.

**Última atualização:** 2026-07-07

---

## Onda 1 — Core

- [x] F-01 Autenticação LDAP/AD (NextAuth v5 + provisão automática + rate limiting)
- [x] F-02 Scanner de código de barras (html5-qrcode + fallback manual)
- [x] F-03 Registro de movimentação (wizard multi-step + token de confirmação)
- [x] F-04 Notificação por e-mail (fire-and-forget + templates HTML)
- [x] F-05 Confirmação pública de recebimento (`/confirmar/[token]` sem auth)
- [x] F-06 Auditoria imutável (AuditLog INSERT-only)
- [x] F-07 Importação CSV de contingência (Latin-1, `;`, upsert, histórico)

---

## Onda 2 — Operacional

- [x] F-08 Backlog SEMAP (lista de `CONFIRMADA_DESTINO` com filtros + paginação)
- [x] F-09 Registro no SICAM (sheet lateral + status `REGISTRADA_SICAM` + protocolo)
- [x] F-10 Vista "meus patrimônios" (Responsável — `/patrimonio` + `/meus-tombos`)
- [x] F-11 Administração CRUD (Unidades, Setores, Usuários, Responsáveis)
- [x] F-12 Notificações in-app (tipos, bell com badge, polling, marcar lida)
- [x] F-13 Histórico de movimentações (`/movimentacao/historico` com filtros)
- [x] F-14 Sincronização Oracle SICAM — Fase 1 (infra + painel admin `/admin/sicam`) *(concluída 2026-05-12)*
- [x] F-15 Movimentações em lote (`/movimentacao/lote`)
- [x] F-16 Consulta de tombos — catálogo (`/tombos` + `/tombos/[id]`)

---

## Onda 3 — Gerencial

- [ ] F-17 Dashboard KPIs (`/dashboard` — total tombos, movimentações, pendentes, registradas)
- [ ] F-18 Gráficos de movimentação (Recharts — por mês, por unidade, por status)
- [ ] F-19 Relatório de auditoria (tabela paginada de AuditLog com filtros)
- [ ] F-20 Histórico de sincronizações SICAM (lista detalhada + erros expandíveis)

---

## Sincronização Oracle — fases avançadas

- [ ] F-21 Sync Oracle SICAM — Fase 2 (sync automático / diferencial / agendado)
- [ ] F-22 Sync Oracle SICAM — Fase 3 (HistoricoTermoSicam completo na UI)
- [ ] F-23 Sync Oracle SICAM — Fase 4 (escrita no Oracle — registro direto sem operador SEMAP)

---

## Backlog técnico

- [ ] T-01 CSP com nonces (remover `unsafe-inline` de script-src)
- [ ] T-02 Sync automático agendado (cron na VPS)
- [ ] T-03 Node.js 24 LTS no Dockerfile
- [ ] T-04 Certificado PKI TRF-1 (substituir self-signed)
- [ ] T-05 Docker image com SHA tag (eliminar `latest` em produção)
- [ ] T-06 Prisma CLI em staging (migrate deploy antes de produção)

---

## Resumo do estado atual

| Onda | Features | Concluídas | Pendentes |
|------|----------|-----------|----------|
| Onda 1 | 7 | 7 | 0 |
| Onda 2 | 9 | 9 | 0 |
| Onda 3 | 4 | 0 | 4 |
| Oracle avançado | 3 | 0 | 3 |
| Técnico | 6 | 0 | 6 |
| **Total** | **29** | **16** | **13** |

---

## Log de conclusões

| Data | Feature | Notas |
|------|---------|-------|
| 2026-05-12 | F-14 Sync SICAM Fase 1 | Infra Oracle + painel admin + timeout Nginx 600s |
| 2026-03-31 | F-01 a F-07 (Onda 1) | Core completo |
| 2026-04-xx | F-08 a F-13, F-15, F-16 | Onda 2 completa |
