# Project Overview — PATRIMOVE (SIMAP)

## O que é o produto

PATRIMOVE é uma aplicação web mobile-first da **Justiça Federal do Amapá (JFAP)** para rastrear a movimentação física de bens patrimoniais (tombos) entre unidades e setores. Ela resolve o problema de comunicação entre dois times que trabalham em silos:

- **TI** — move o equipamento fisicamente, mas não tem acesso ao SICAM
- **SEMAP** — precisa registrar a movimentação no SICAM legado, mas não sabe quando TI moveu algo

PATRIMOVE fecha esse gap: TI registra a movimentação no app, o servidor de destino confirma o recebimento via link público (sem login), e o SEMAP encontra tudo organizado no backlog para registrar no SICAM.

A fonte primária de dados de patrimônio é a **integração direta com o Oracle SICAM** (leitura). CSV continua disponível apenas como fallback de contingência quando a conectividade Oracle está indisponível.

---

## Quem usa (4 perfis)

| Perfil | Quem é | O que faz no app |
|--------|--------|-----------------|
| `TECNICO_TI` | Técnico do NTI | Registra movimentações (scanner ou digitação), consulta tombos |
| `SERVIDOR_RESPONSAVEL` | Servidor que recebe bens | Confirma recebimento via link público (ou app), vê seus patrimônios |
| `SERVIDOR_SEMAP` | Seção de Material e Patrimônio | Registra movimentações no SICAM, gerencia backlog, importa CSV |
| `GESTOR_ADMIN` | Gestor / Administrador | Dashboard KPIs, importação CSV, administração de usuários/unidades |

---

## Fluxo completo do usuário

```
[TI registra movimentação]
  → Seleciona tombos (scanner ou busca manual)
  → Escolhe unidade/setor de destino
  → App cria Movimentacao (status: PENDENTE_CONFIRMACAO)
  → E-mail enviado ao responsável do destino com link de confirmação
  → Notificação in-app criada

[Responsável confirma recebimento]
  → Acessa link público /confirmar/[token] (sem login necessário)
  → Confirma que recebeu os bens
  → Status → CONFIRMADA_DESTINO
  → Notificação in-app para o SEMAP

[SEMAP registra no SICAM]
  → Acessa backlog de movimentações confirmadas
  → Abre movimentação, preenche protocolo SICAM
  → Status → REGISTRADA_SICAM
  → Ciclo encerrado
```

---

## Páginas e rotas

### Públicas (sem autenticação)
- `/login` — Autenticação LDAP/AD
- `/confirmar/[token]` — Confirmação de recebimento (link enviado por e-mail)
- `/api/health` — Health check do sistema

### Autenticadas (por perfil)

**TECNICO_TI:**
- `/home` — Resumo: movimentações recentes, atalhos rápidos
- `/movimentacao` — Lista de movimentações (filtros por status/período)
- `/movimentacao/nova` — Wizard: scanner → seleção tombos → destino → confirmar
- `/movimentacao/[id]` — Detalhe e timeline de uma movimentação
- `/movimentacao/historico` — Histórico completo com filtros avançados
- `/tombos` — Catálogo de tombos com busca
- `/tombos/[id]` — Detalhe de um tombo
- `/meus-tombos` — Tombos dos quais o usuário é responsável
- `/notificacoes` — Central de notificações

**SERVIDOR_RESPONSAVEL:**
- `/home` — Cards de patrimônios sob responsabilidade + alertas
- `/patrimonio` — Lista completa dos bens do servidor
- `/movimentacao/lote` — Movimentações em lote
- `/meus-tombos` — Tombos de responsabilidade
- `/notificacoes` — Notificações (saídas, entradas, confirmações)

**SERVIDOR_SEMAP:**
- `/home` — Backlog resumido + ações rápidas
- `/backlog` — Movimentações CONFIRMADA_DESTINO aguardando registro SICAM
- `/movimentacao/lote` — Movimentações em lote
- `/tombos` — Catálogo completo de tombos
- `/admin` — Painel administrativo (unidades, setores, perfis, responsáveis)
- `/admin/sicam` — Sincronização Oracle SICAM (disparar sync, ver histórico)

**GESTOR_ADMIN:**
- `/home` — KPIs executivos + resumo operacional
- `/dashboard` — Dashboard completo com gráficos (Recharts)
- `/importacao` — Upload CSV de contingência
- `/importacao/historico` — Histórico de importações CSV
- `/admin` — Administração completa
- `/notificacoes` — Notificações do sistema

---

## Dentro do escopo

- Registro de movimentação de bens patrimoniais (tombos) entre unidades/setores da JFAP
- Confirmação de recebimento via link público (sem login)
- Backlog e registro manual no SICAM pelo SEMAP
- Sincronização de dados de patrimônio via Oracle SICAM (leitura)
- Importação CSV como fallback de contingência
- Dashboard KPIs para gestão
- Auditoria imutável de todas as ações
- Notificações in-app e por e-mail
- Administração de usuários, unidades, setores e perfis
- Scanner de código de barras/QR code via câmera

## Fora do escopo

- Escrita direta no SICAM Oracle (apenas leitura; registro é manual pelo operador SEMAP)
- Gestão de contratos, licitações ou processos de compra
- Gestão financeira de patrimônio
- Inventário físico (contagem)
- Integração com outros sistemas além do SICAM Oracle
- App mobile nativo (iOS/Android) — é web mobile-first
- Multi-órgão (apenas JFAP)
- Relatórios PDF/Excel exportáveis (fora da Onda 3 atual)
