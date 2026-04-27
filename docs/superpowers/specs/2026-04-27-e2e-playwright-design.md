# E2E Playwright — Cobertura dos Principais Fluxos

**Data:** 2026-04-27  
**Escopo:** Expandir a suite E2E existente para cobrir o caminho crítico com profundidade e as páginas faltantes com cobertura básica, usando testes assertivos (dados verificados via DB antes da interação).

---

## Contexto

O projeto já possui 9 arquivos E2E (`e2e/*.spec.ts`) cobrindo login, movimentação parcial, confirmação parcial, backlog, admin, dashboard, importação e notificações. Os problemas identificados:

1. Login repetido em todo `beforeEach` sem helper compartilhado.
2. Queries de DB duplicadas entre `movimentacao.spec.ts` e `confirmacao.spec.ts`.
3. Vários testes com verificações condicionais (`if (await isVisible())`) que passam silenciosamente sem dados.
4. Fluxo de criação de movimentação incompleto (para em "Confirmar Destino", não submete).
5. Fluxo de confirmação incompleto (verifica botão mas não clica).
6. Registro SICAM no backlog é condicional — não assertivo.
7. Páginas `/patrimonio`, `/tombos`, `/movimentacao/historico` sem nenhuma cobertura.
8. Home por perfil sem cobertura.
9. Logout não testado.

---

## Abordagem: Helpers Compartilhados + Novos Specs

Criar `e2e/helpers.ts` com utilitários reutilizáveis. Arquivos existentes são tocados minimamente (apenas onde remove duplicação crítica). Novos specs já nascem usando o helper.

---

## Módulo: `e2e/helpers.ts`

Exportações:

```ts
loginAs(page: Page, matricula: string, senha?: string): Promise<void>
// senha default: "senha123"
// realiza o login e aguarda redirect para /home

queryDb<T>(sql: string, params?: unknown[]): Promise<T[]>
// cria cliente pg efêmero com DATABASE_URL, executa query, desconecta

getTomboDisponivel(): Promise<string | null>
// tombo sem movimentação ativa (status PENDENTE_CONFIRMACAO ou CONFIRMADA_ORIGEM)

buscarMovimentacaoPendente(matricula: string): Promise<string | null>
// id de movimentação PENDENTE_CONFIRMACAO cujo destino é a unidade do usuário

getMovimentacaoConfirmada(): Promise<string | null>
// id de movimentação com status CONFIRMADA_ORIGEM (para fluxo de registro SICAM)

getUnidadeDestino(excluirUnidadeId?: string): Promise<{ id: string; codigo: string } | null>
// unidade ativa diferente da origem para usar no select de destino
```

---

## Caminho Crítico — Completar Fluxos Existentes

### `e2e/movimentacao.spec.ts` — novo teste

**"deve completar fluxo completo de criação de movimentação"**

1. `getTomboDisponivel()` + `getUnidadeDestino()` — asserta que ambos existem
2. Login como AP20151 (TECNICO_TI)
3. Navega para `/movimentacao/nova`
4. Modo Manual → preenche tombo → Adicionar → verifica tombo no lote → Avançar
5. Tela "Confirmar Destino": seleciona unidade destino → Confirmar
6. Aguarda redirect para `/movimentacao/[id]`
7. Asserta: badge `PENDENTE_CONFIRMACAO` visível, tombos listados, botão de confirmação ausente (criador ≠ destino)

### `e2e/confirmacao.spec.ts` — novo teste

**"deve confirmar movimentação com sucesso"**

1. `buscarMovimentacaoPendente("AP20153")` — asserta que existe
2. Login como AP20153 (SERVIDOR_RESPONSAVEL — é o destino)
3. Navega para `/movimentacao/[id]`
4. Clica em "Confirmar movimentação" → confirma no dialog
5. Asserta: status muda para `CONFIRMADA_ORIGEM`, botão de confirmação some

### `e2e/backlog.spec.ts` — substituir teste condicional

**"deve registrar movimentação no SICAM com sucesso"** (tornar assertivo)

1. `getMovimentacaoConfirmada()` — asserta que pelo menos uma movimentação `CONFIRMADA_ORIGEM` existe
2. Navega para `/backlog` (já no `beforeEach`)
3. Asserta que o botão "Registrar no SICAM" está visível (sem `if`)
4. Clica → sheet abre com campos `#protocolo` e `#dataRegistro`
5. Preenche protocolo + data de hoje → Confirmar
6. Asserta: toast/badge `REGISTRADA_SICAM`

---

## Novos Arquivos

### `e2e/home.spec.ts`

Quatro describes, um por perfil, cada um com login diferente:

| Perfil | Matrícula | Asserções |
|--------|-----------|-----------|
| TECNICO_TI | AP20151 | botão "Nova Movimentação", card de movimentações recentes |
| SERVIDOR_RESPONSAVEL | AP20153 | card de pendentes de confirmação |
| SERVIDOR_SEMAP | AP20157 | card de backlog / pendentes SICAM |
| GESTOR_ADMIN | AP20159 | KPIs: total movimentações, pendentes |

### `e2e/patrimonio.spec.ts`

Login como AP20153 (SERVIDOR_RESPONSAVEL). Testes:

1. **"deve exibir a página Meus Patrimônios"** — heading visível
2. **"deve exibir lista de tombos"** — `queryDb` conta tombos da unidade → asserta tabela se > 0, empty state se = 0
3. **"deve exibir badge de pendentes"** — `queryDb` conta pendentes de confirmação → badge condizente
4. **"deve filtrar por número de tombo"** — `queryDb` pega número real → digita no campo busca → asserta linha na tabela

### `e2e/tombos.spec.ts`

Login como AP20151 (TECNICO_TI). Testes:

1. **"deve exibir a página Tombos"** — heading visível
2. **"deve buscar tombo por número"** — `getTomboDisponivel()` → busca → asserta linha
3. **"deve redirecionar GESTOR_ADMIN para /home"** — controle de acesso (AP20159 acessa `/tombos` → redirect)

### `e2e/historico.spec.ts`

Login como AP20151 (TECNICO_TI). Testes:

1. **"deve exibir histórico de movimentações"** — heading + (tabela ou empty state)
2. **"deve filtrar por status"** — seleciona `PENDENTE_CONFIRMACAO` → URL atualiza com query param `status=PENDENTE_CONFIRMACAO`

### Logout — adicionar em `e2e/login.spec.ts`

**"deve fazer logout com sucesso"**

1. Login como AP20151
2. Clica no menu do usuário (avatar/nome no header)
3. Clica "Sair"
4. Asserta redirect para `/login`

---

## Usuários do Seed

| Matrícula | Perfil |
|-----------|--------|
| AP20151 | TECNICO_TI |
| AP20153 | SERVIDOR_RESPONSAVEL |
| AP20155 | TECNICO_TI |
| AP20157 | SERVIDOR_SEMAP |
| AP20159 | GESTOR_ADMIN |
| AP20256 | SERVIDOR_RESPONSAVEL |

Senha padrão de todos: `senha123` (exceto AP20151 no seed atual: `qualquer` — o helper usará `senha123` como default, com override onde necessário).

---

## O que NÃO está no escopo

- Refatoração total dos specs existentes (POM)
- Testes de scanner (câmera — requer mock de media devices)
- Testes de envio real de e-mail
- Importação CSV com arquivo Latin-1 inválido (já coberto em `importacao.spec.ts`)
- Mobile viewport além do que já existe em `notificacoes.spec.ts`

---

## Resumo de entregas

| Entrega | Tipo |
|---------|------|
| `e2e/helpers.ts` | Novo arquivo |
| `e2e/home.spec.ts` | Novo arquivo |
| `e2e/patrimonio.spec.ts` | Novo arquivo |
| `e2e/tombos.spec.ts` | Novo arquivo |
| `e2e/historico.spec.ts` | Novo arquivo |
| `e2e/movimentacao.spec.ts` | Completar fluxo de criação |
| `e2e/confirmacao.spec.ts` | Completar fluxo de confirmação |
| `e2e/backlog.spec.ts` | Tornar teste SICAM assertivo |
| `e2e/login.spec.ts` | Adicionar teste de logout |
