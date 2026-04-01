# PATRIMOVE — Conceito de MVP

**Versão 1.0 | Março 2026 | JFAP — Núcleo de TI**

---

## 1. Hipótese Central

> "Se disponibilizarmos uma ferramenta mobile para registro imediato de movimentações patrimoniais com leitura de código de barras e notificação automática por e-mail, os técnicos de TI passarão a registrar 100% das movimentações, eliminando o gap de comunicação com a SEMAP e garantindo a rastreabilidade completa dos bens patrimoniais da JFAP."

### Objetivos Priorizados

| Objetivo PRD | Prioridade MVP | Onda |
|-------------|---------------|------|
| OBJ-01: Registrar movimentações em tempo real | Máxima | Onda 1 |
| OBJ-02: Automatizar comunicação entre áreas | Máxima | Onda 1 |
| OBJ-03: Backlog de pendências para SEMAP | Alta | Onda 2 |
| OBJ-04: Histórico para auditoria | Alta | Onda 2 |
| OBJ-05: Visualização de patrimônio por responsável | Alta | Onda 2/3 |

---

## 2. Público-Alvo

| Perfil | Qtd. Est. | Onda | Papel |
|--------|-----------|------|-------|
| Técnico de TI | 5-10 | Onda 1 | Registra movimentações via scanner; importa CSV |
| Servidor Responsável | 50+ | Onda 1 | Confirma saída (link público); visualiza patrimônios |
| Servidor SEMAP | 3-5 | Onda 2 | Backlog; registro SICAM; importação CSV; CRUD admin |
| Gestor/Admin | 3-5 | Onda 3 | Dashboard gerencial; CRUD admin completo |

**Implantação:** Direta para todas as 50+ unidades. Sem piloto restrito.

**Escala:** ~12.000 tombos, ~300 movimentações/mês.

---

## 3. Problema Resolvido

As movimentações físicas de bens patrimoniais entre unidades da JFAP não são comunicadas à SEMAP em tempo hábil, gerando desatualização dos registros no SICAM.

| Perfil | Problema | Como o MVP Resolve |
|--------|----------|--------------------|
| Técnico TI | Sem ferramenta para registro no momento da execução | App mobile com scanner Code 128 |
| Servidor Responsável | Sem ciência de movimentações; não comprova | Notificações e-mail; confirmação via link; visualização de patrimônios |
| Servidor SEMAP | Informações com atraso; sem visão de pendências | Backlog com filtros; formulário registro SICAM |
| Gestor/Admin | Sem visibilidade; não consegue auditar | Dashboard KPIs + relatórios |

---

## 4. Funcionalidades por Onda

### Onda 1 — Core (Registro + Comunicação)

| Funcionalidade | Requisitos PRD |
|---------------|---------------|
| Autenticação LDAP/AD | RF-01, RF-02 |
| Importação CSV do SICAM (3 etapas) | RF-05 a RF-08 |
| Scanner Code 128 + input manual | RF-09, RF-10 |
| Registro de movimentação (múltiplos tombos) | RF-11, RF-12 |
| E-mail para origem (link com token) | RF-13, RF-15 |
| E-mail informativo para destino | RF-14 |
| Página pública de confirmação | RF-03, RF-15 |
| Home do Técnico de TI | — |
| Registro de auditoria básico | RF-26, RF-27 |

**Resultado:** Técnico registra via mobile → origem confirma → destino notificado. Gap de comunicação resolvido.

### Onda 2 — Operacional (SEMAP + Patrimônios + Admin)

| Funcionalidade | Requisitos PRD |
|---------------|---------------|
| Backlog da SEMAP (filtros, ordenação) | RF-16 |
| Registro de confirmação SICAM (protocolo, data, obs.) | RF-17, RF-18 |
| Visualização de patrimônios por responsável | RF-19, RF-20 |
| CRUD Administrativo (unidades, setores, responsáveis, perfis) | — |
| Central de notificações in-app | — |
| Histórico de movimentações | RF-26 |

**Resultado:** SEMAP com fluxo completo. Servidores visualizam patrimônios. Admins gerenciam cadastros. Ciclo operacional fechado.

### Onda 3 — Gerencial (Dashboard + Relatórios)

| Funcionalidade | Requisitos PRD |
|---------------|---------------|
| Dashboard: 3 KPIs (tempo médio, pendentes SICAM, pendentes confirmação) | RF-21 a RF-23 |
| Dashboard: gráfico movimentações por período | RF-24 |
| Dashboard: visão por unidade | RF-24 |
| Dashboard: relatórios de auditoria | RF-25 |
| Histórico de importações CSV | — |

**Resultado:** Gestor com visibilidade completa. JFAP preparada para auditoria.

### Fora do MVP

| Funcionalidade | Motivo |
|---------------|--------|
| Relatórios em PDF | Dashboard já fornece visibilidade |
| Inventário físico | Depende da base consolidada |
| Integração SICAM | API não disponível |
| Fila offline | Complexidade alta |
| Busca global (Ctrl+K) | Não essencial |

---

## 5. Restrições

| Restrição | Impacto |
|-----------|---------|
| SICAM sem API — carga apenas via CSV | Base depende de importações periódicas |
| VPS interna com Docker | Deploy e manutenção pela TI interna |
| LDAP/AD como único provider | Todos devem ter conta no AD |
| Mobile-first (Chrome/Safari) | Scanner depende de getUserMedia |
| Ambiente único de produção | Testes robustos pré-deploy são essenciais |
| CSV Latin-1 com delimitador ";" | Parser deve tratar encoding explicitamente |
| Prazo de confirmação não definido (QA-01) | Decidir antes da Onda 1 |

---

## 6. Métricas de Sucesso

### Onda 1

| Métrica | Meta |
|---------|------|
| Taxa de registro digital | 100% via PATRIMOVE |
| Taxa de notificação | 100% com e-mail enviado |
| Taxa de confirmação (origem) | > 80% confirmadas |
| Adoção pelos técnicos | 100% dos técnicos usando |

### Onda 2

| Métrica | Meta |
|---------|------|
| Processamento SEMAP | > 90% registradas em 5 dias úteis |
| Uso "Meus Patrimônios" | > 50% dos responsáveis no 1º mês |

### Onda 3

| Métrica | Meta |
|---------|------|
| Redução do tempo médio de registro | > 50% vs. baseline |
| Acesso ao dashboard | Gestores 1x/semana |
| Rastreabilidade | 100% com trilha completa |
