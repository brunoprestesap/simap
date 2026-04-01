# PATRIMOVE — Documento de Requisitos de Produto (PRD)

**Versão 1.0 | Março 2026 | JFAP — Núcleo de TI**

---

## 1. Introdução / Visão Geral

A Justiça Federal do Amapá (JFAP) utiliza o sistema SICAM, mantido pelo TRF1, para gestão patrimonial. Atualmente, a Seção de Material e Patrimônio (SEMAP) é a única área com acesso ao SICAM, e as movimentações físicas de bens patrimoniais entre unidades organizacionais frequentemente não são comunicadas à SEMAP em tempo hábil, gerando desatualização dos registros de localização dos tombos.

O principal problema reside no gap de comunicação: quando a área de Tecnologia da Informação (TI) executa movimentações de equipamentos entre unidades, o registro correspondente no SICAM pela SEMAP sofre atrasos significativos ou simplesmente não ocorre.

O PATRIMOVE é uma aplicação web responsiva (mobile-first) que visa eliminar esse gap, fornecendo uma ferramenta de registro imediato de movimentações patrimoniais via dispositivo móvel, com leitura de código de barras, notificações automáticas por e-mail e rastreabilidade completa para fins de auditoria.

**Restrição crítica:** O SICAM não disponibiliza API ou qualquer meio de integração. A carga de dados será realizada por importação de arquivos CSV exportados do SICAM.

---

## 2. Objetivos / Metas

### 2.1 Objetivo Geral

Garantir a rastreabilidade de 100% das movimentações de bens patrimoniais da JFAP, eliminando o gap de comunicação entre as áreas operacionais e a SEMAP.

### 2.2 Objetivos Específicos

| # | Objetivo | Métrica de Sucesso | Prazo |
|---|----------|-------------------|-------|
| OBJ-01 | Registrar todas as movimentações patrimoniais em tempo real via dispositivo móvel | 100% das movimentações registradas na aplicação | Pós-implantação |
| OBJ-02 | Automatizar a comunicação entre áreas sobre movimentações patrimoniais | 100% das movimentações com notificação enviada por e-mail | Pós-implantação |
| OBJ-03 | Fornecer à SEMAP um backlog de pendências para registro no SICAM | Redução do tempo médio entre movimentação física e registro no SICAM | Contínuo |
| OBJ-04 | Manter histórico completo de movimentações para auditoria | 100% das movimentações com trilha de auditoria completa | Contínuo |
| OBJ-05 | Permitir que servidores responsáveis visualizem o patrimônio sob sua responsabilidade | Acesso disponível a todos os servidores responsáveis | Pós-implantação |

---

## 3. Público-Alvo / Personas de Usuário

| Perfil | Descrição | Principais Responsabilidades |
|--------|-----------|------------------------------|
| Técnico de TI (Atendente) | Servidor da área de TI que executa fisicamente as movimentações de equipamentos entre unidades | Leitura de código de barras dos tombos; registro de movimentações via dispositivo móvel; entrada manual do número do tombo quando necessário |
| Servidor Responsável pela Unidade | Servidor designado como responsável pelos bens patrimoniais de uma unidade organizacional | Confirmação de saída de tombos (origem) via link público por e-mail; visualização de todos os patrimônios sob sua responsabilidade |
| Servidor da SEMAP | Servidor da Seção de Material e Patrimônio responsável pelo registro oficial no SICAM | Visualização do backlog de movimentações pendentes; confirmação de registro no SICAM com protocolo, data e observações; importação de arquivos CSV do SICAM |
| Gestor / Administrador Geral | Gestores das áreas com necessidade de visão gerencial | Dashboard gerencial com indicadores consolidados; relatórios e métricas de movimentação; CRUD administrativo |

---

## 4. Histórias de Usuário / Casos de Uso

### 4.1 Técnico de TI

- **US-01:** Como técnico de TI, quero escanear o código de barras (Code 128) de um tombo com meu dispositivo móvel, para registrar a movimentação de forma rápida e sem erros de digitação.
- **US-02:** Como técnico de TI, quero digitar manualmente o número do tombo quando o código de barras estiver danificado ou ilegível.
- **US-03:** Como técnico de TI, quero registrar a unidade de destino da movimentação, para que o sistema notifique automaticamente os responsáveis envolvidos.
- **US-04:** Como técnico de TI, quero visualizar o status das movimentações que registrei.

### 4.2 Servidor Responsável pela Unidade

- **US-05:** Como servidor responsável (origem), quero receber um e-mail com link para confirmar a saída de tombos da minha unidade.
- **US-06:** Como servidor responsável (destino), quero receber uma notificação por e-mail informando a entrada de tombos na minha unidade.
- **US-07:** Como servidor responsável, quero visualizar todos os patrimônios atualmente sob minha responsabilidade.

### 4.3 Servidor da SEMAP

- **US-08:** Como servidor da SEMAP, quero visualizar um backlog de todas as movimentações pendentes de registro no SICAM.
- **US-09:** Como servidor da SEMAP, quero confirmar o registro de uma movimentação no SICAM informando protocolo, data e observações.
- **US-10:** Como servidor da SEMAP, quero importar arquivos CSV exportados do SICAM para atualizar a base de tombos.

### 4.4 Gestor / Administrador Geral

- **US-11:** Como gestor, quero acessar um dashboard com visão consolidada das movimentações.
- **US-12:** Como gestor, quero visualizar relatórios de auditoria do histórico de movimentações.

---

## 5. Requisitos Funcionais

### 5.1 Autenticação e Autorização

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | Autenticar usuários via LDAP/Active Directory da JFAP | Alta |
| RF-02 | Suportar 4 perfis de acesso: Técnico TI, Servidor Responsável, Servidor SEMAP, Gestor/Admin | Alta |
| RF-03 | Permitir acesso público a páginas de confirmação via link com token único e validade limitada | Alta |
| RF-04 | Obter e-mail dos servidores a partir do LDAP/AD usando a matrícula do CSV | Alta |

### 5.2 Importação de Dados (CSV)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-05 | Permitir upload de CSV do SICAM (delimitador `;`, encoding Latin-1) | Alta |
| RF-06 | Extrair automaticamente 11 campos: Número tombo, Descrição Material, Cód. Fornecedor, Nome Fornecedor, Cód. Lotação, Desc. Lotação, Cód. Setor, Nome Setor, Matrícula Responsável, Nome Responsável, Saída | Alta |
| RF-07 | Importação recorrente executável pela TI e SEMAP | Alta |
| RF-08 | Upsert com base no Número do Tombo como chave única | Alta |

### 5.3 Registro de Movimentações

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-09 | Leitura de códigos de barras Code 128 via câmera do dispositivo móvel | Alta |
| RF-10 | Entrada manual do número do tombo como alternativa | Alta |
| RF-11 | Registrar movimentação com: tombo(s), origem (auto), destino (selecionado), data/hora, técnico | Alta |
| RF-12 | Permitir múltiplos tombos em uma única movimentação | Alta |

### 5.4 Notificações por E-mail

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-13 | E-mail ao responsável da origem com link de confirmação (token único) | Alta |
| RF-14 | E-mail informativo ao responsável do destino | Alta |
| RF-15 | Página pública de confirmação com listagem de tombos, sem necessidade de login | Alta |

### 5.5 Backlog da SEMAP

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-16 | Tela tipo backlog com movimentações pendentes de registro no SICAM | Alta |
| RF-17 | Registro de confirmação no SICAM com protocolo, data e observações | Alta |
| RF-18 | Atualização de status para "Registrada no SICAM" | Alta |

### 5.6 Visualização e Dashboard

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-19 | Visualização de tombos por responsável/unidade | Alta |
| RF-20 | Busca e filtros por nº tombo, descrição, unidade, responsável | Média |
| RF-21 | Dashboard: total de movimentações por período | Alta |
| RF-22 | Dashboard: pendentes de confirmação pela origem | Alta |
| RF-23 | Dashboard: pendentes de registro no SICAM | Alta |
| RF-24 | Dashboard: visão por unidade organizacional | Alta |
| RF-25 | Dashboard: relatórios de auditoria com filtros | Alta |

### 5.7 Auditoria

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-26 | Registro histórico completo de todas as movimentações | Alta |
| RF-27 | Registros de auditoria imutáveis (somente inserção) | Alta |

---

## 6. Requisitos Não Funcionais

| Categoria | ID | Requisito |
|-----------|----|-----------|
| Desempenho | RNF-01 | Suportar 50 unidades, 12.000 tombos, 300 movimentações/mês |
| Desempenho | RNF-02 | Leitura de código de barras em menos de 2 segundos |
| Usabilidade | RNF-03 | Interface mobile-first e responsiva |
| Usabilidade | RNF-04 | Registro completável em no máximo 5 toques após leitura do código |
| Segurança | RNF-05 | Autenticação LDAP/AD; tokens únicos com validade temporal |
| Segurança | RNF-06 | HTTPS em todas as rotas |
| Infraestrutura | RNF-07 | Containerização com Docker em VPS interna |
| Infraestrutura | RNF-08 | Banco de dados PostgreSQL |
| Compatibilidade | RNF-09 | Chrome e Safari (versões recentes) em Android e iOS |
| Disponibilidade | RNF-10 | Disponível durante horário de expediente (dias úteis) |

---

## 7. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js 16 (Server Actions) |
| Banco de Dados | PostgreSQL via Prisma ORM |
| Autenticação | NextAuth.js v5 com provider LDAP/AD |
| Scanner | @zxing/library (Code 128) |
| E-mail | Nodemailer (SMTP interno) |
| Gráficos | Recharts |
| Tabelas | TanStack Table |
| Validação | Zod |
| Testes | Vitest + Playwright |
| Deploy | Docker Compose em VPS interna |

---

## 8. Fluxo Principal de Movimentação

1. Técnico TI recebe solicitação para movimentar equipamentos
2. Técnico escaneia códigos de barras (Code 128) ou digita manualmente
3. Técnico seleciona unidade de destino e confirma o registro
4. Sistema registra com status "Pendente de Confirmação" e envia e-mails:
   - **Origem:** link com token para confirmação de saída
   - **Destino:** notificação informativa de entrada
5. Responsável da origem confirma via link público (sem login)
6. Movimentação aparece no backlog da SEMAP
7. SEMAP registra no SICAM e confirma na aplicação (protocolo + data + observações)

---

## 9. Estrutura de Dados do CSV (SICAM)

Delimitador: `;` | Encoding: Latin-1 | Total de colunas: 38 | Campos utilizados: 11

| Campo | Uso na Aplicação |
|-------|------------------|
| Número Tombo | Chave primária; código de barras |
| Descrição Material | Identificação do bem |
| Código/Nome Fornecedor | Referência complementar |
| Código/Descrição Lotação | Unidade organizacional |
| Código/Nome Setor | Localização detalhada |
| Matrícula/Nome Responsável | Vínculo do responsável; consulta LDAP |
| Saída | Controle de status |

---

## 10. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Taxa de rastreabilidade | 100% das movimentações registradas |
| Taxa de notificação | 100% com e-mail enviado |
| Tempo médio de confirmação (origem) | A definir |
| Tempo médio de registro no SICAM | Redução progressiva |
| Adoção do sistema | 100% dos técnicos usando |

---

## 11. Questões em Aberto

| # | Questão | Impacto | Recomendação |
|---|---------|---------|--------------|
| QA-01 | Prazo para confirmação da origem e ação se não confirmar | Alto | 5 dias úteis; segue com flag "Não confirmada" |
| QA-02 | Validade dos tokens de confirmação | Médio | 7 dias |
| QA-03 | Importação CSV: substituição ou upsert | Médio | Upsert por Nº Tombo |
| QA-04 | Tombos baixados no SICAM | Médio | Marcar como "Baixado" sem excluir |

---

## 12. Considerações Futuras

| Fase | Funcionalidade |
|------|---------------|
| Fase 2 | Geração de relatórios em PDF para auditoria |
| Fase 2 | Inventário físico com leitura de código de barras por unidade |
| Fase 3 | Integração direta com o SICAM (se TRF1 disponibilizar API) |
