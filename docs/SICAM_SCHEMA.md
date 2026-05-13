# Schema SICAM — Mapeamento Oracle → SIMAP

> **Status:** Em descoberta. Preenchido iterativamente conforme tabelas são identificadas via `/admin/sicam` e validadas com queries de teste.

## Visão geral

- **Servidor:** `172.18.3.3:1521/jfap.trf1.gov.br`
- **Schema dono dos objetos:** `SICAM` (filtrado em `SICAM_ORACLE_SCHEMA_OWNER`)
- **Login da aplicação:** `ap20256` (read-only). `CURRENT_SCHEMA` é setado para `SICAM` em cada sessão via `sessionCallback` em [lib/sicam-oracle/client.ts](../lib/sicam-oracle/client.ts) — queries podem referenciar tabelas sem o prefixo `SICAM.`.
- **Driver:** Thick mode (Instant Client 23.x) — necessário por causa do password verifier 10G.
- **Convenções observadas:** nomes em UPPERCASE, separados por underscore. Tabelas `DR$*` são índices Oracle Text (ignorar). Tabelas terminadas em `_AUDIT` são triggers de auditoria (geralmente ignorar para leituras de SIMAP).

## Campos canônicos a mapear

A fonte da verdade do que o SIMAP precisa é o **CSV legado** do SICAM, parseado por [server/services/csv-parser.ts](../server/services/csv-parser.ts). As 12 colunas extraídas:

| # | Conceito SIMAP | Campo no CSV | Coluna Prisma | Notas |
|---|---|---|---|---|
| 1 | Tipo (filtro) | `Tipo Tombo` | — | descartar linhas com `tipo=L` (liquidado) |
| 2 | Tombo nº | `Número Tombo` | `Tombo.numero` | string, único, podem ter zeros à esquerda |
| 3 | Descrição | `Descrição Material` | `Tombo.descricaoMaterial` | longa; specs técnicas com `;` internos |
| 4 | Cód. fornecedor | `Código Fornecedor` | `Tombo.codigoFornecedor` | opcional |
| 5 | Nome fornecedor | `Nome Fornecedor` | `Tombo.nomeFornecedor` | opcional |
| 6 | Cód. lotação | `Código Lotação` | `Unidade.codigo` via FK | obrigatório |
| 7 | Descrição lotação | `Descrição Lotação` | `Unidade.descricao` | quando criar unidade nova |
| 8 | Cód. setor | `Código Setor` | `Setor.codigo` via FK | obrigatório; PK composta com lotação |
| 9 | Nome setor | `Nome Setor` | `Setor.nome` | quando criar setor novo |
| 10 | Matrícula | `Matrícula Responsável` | `Tombo.matriculaResponsavel` + FK `Usuario` | uppercase |
| 11 | Nome responsável | `Nome Responsável` | `Tombo.nomeResponsavel` | snapshot |
| 12 | Saída (filtro) | `Saída` | — | descartar linhas com `saida=SAIU` |

## Tabelas identificadas (Round 1 + Round 2)

### `SICAM.TOMBO` — tombo / bem patrimonial

**~14.619 linhas, 49 colunas.** Tabela principal. Termo canônico do SICAM é "tombo" (não "BEM" — busca retornou zero).

Colunas relevantes ao SIMAP:

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `NU_TOMBO` | NUMBER | `Tombo.numero` (cast para string) |
| 2 | `TI_TOMBO` | CHAR(1) | filtro: descartar `'L'` |
| 3 | `CO_MAT` | NUMBER | FK → `MATERIAL.CO_MAT` (descrição) |
| 7 | `CO_FORN` | VARCHAR2(14) | `Tombo.codigoFornecedor` |
| 10 | `NU_TERMO` | NUMBER (nullable) | FK composto → `TERMO` |
| 11 | `AN_TERMO` | NUMBER (nullable) | FK composto → `TERMO` |
| 12 | `TI_TERMO` | NUMBER (nullable) | FK composto → `TERMO` |
| 14 | `IN_SAIDA` | NUMBER | filtro: descartar quando `1` (saída) |
| 21 | `NO_FORN` | VARCHAR2(200) | `Tombo.nomeFornecedor` (denormalizado) |
| 23 | `CO_SETOR` | NUMBER (nullable) | setor INICIAL (não atual — atual vem do TERMO) |
| 28 | `NU_MATR_RESP_CRIACAO` | VARCHAR2(15) | matrícula de quem criou o registro (não é o responsável atual) |
| 42 | `TI_ESTADO_CONSERVACAO` | NUMBER | FK → `TOMBO_ESTADO_CONSERVACAO` |
| 43 | `TI_CLASSIFICACAO` | NUMBER | FK → `TOMBO_CLASSIFICACAO` |

**Observação crítica**: a descrição do material **não está** em TOMBO — vem via JOIN com MATERIAL.

Tabelas auxiliares relacionadas:
- `TIPO_TOMBO` (~5 linhas) — lookup: `TI_TOMBO CHAR(1)`, `NO_TOMBO VARCHAR2(20)`
- `TOMBO_CLASSIFICACAO` (~4 linhas), `TOMBO_ESTADO_CONSERVACAO` (~8 linhas) — lookups auxiliares
- `TOMBO_AUDIT`, `DEPRECIACAO_MENSAL_TOMBO`, `HISTORICO_TOMBO` — não relevantes para Fase 2

### `SICAM.MATERIAL` — catálogo de materiais

**44 colunas, mas só uma importa**:

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `CO_MAT` | NUMBER | PK (FK de TOMBO) |
| 31 | `DE_MAT` | VARCHAR2(4000) NOT NULL | `Tombo.descricaoMaterial` |

Demais colunas são de almoxarifado (saldos, quantidades, datas) — ignorar.

### `SICAM.TERMO` — termo de responsabilidade

**15 colunas.** Esta é a **fonte da verdade** para localização atual e responsável atual do tombo.

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `NU_TERMO` | NUMBER | PK composta (FK de TOMBO) |
| 2 | `AN_TERMO` | NUMBER | PK composta |
| 3 | `TI_TERMO` | NUMBER | PK composta |
| 4 | `CO_LOTA` | NUMBER | **`Unidade.codigo` atual** |
| 5 | `CO_SETOR` | NUMBER | **`Setor.codigo` atual** (junto com CO_LOTA) |
| 6 | `DT_TERMO` | DATE | data do termo |
| 7 | `NU_MATR_RESP_TOMBO` | VARCHAR2(15) | **`Tombo.matriculaResponsavel`** |
| 8 | `CO_LOTA_ORIGEM` | NUMBER | lotação anterior (histórico) |
| 11 | `NO_RECEB` | VARCHAR2(50) | **`Tombo.nomeResponsavel`** |
| 14 | `FG_ASSINADO` | VARCHAR2(1) | filtro: só usar `'S'` |

**Modelo conceitual**: cada movimentação de um tombo gera um novo TERMO. As colunas `NU_TERMO/AN_TERMO/TI_TERMO` em `TOMBO` apontam para o termo **atual** (o último assinado). Quando NULL, o tombo nunca foi transferido (mantém localização inicial em `TOMBO.CO_SETOR`).

### `SICAM.PATRIMONIO_SETOR` — master de setores

**~1.136 linhas, 4 colunas:**

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `CO_LOTA` | NUMBER | PK composta (parte) |
| 2 | `CO_SETOR` | NUMBER | PK composta (parte) |
| 3 | `NO_SETOR` | VARCHAR2(100) NOT NULL | `Setor.nome` |
| 4 | `FLAG_ATIVA` | NUMBER NOT NULL | filtro: só ativos |

**PK composta**: o mesmo `CO_SETOR` pode existir em múltiplas lotações. **Sempre fazer JOIN com `CO_LOTA + CO_SETOR`**.

### `SICAM.LOTACAO_SICAM_RH` — descartada

**~48 linhas, 3 colunas.** Usa código hierárquico diferente de `TERMO.CO_LOTA` (100000, 100010…). Não tem coluna de descrição. **Descartada.**

### `SARH.RH_LOTACAO` — master de lotações (fonte correta)

**474 linhas.** Schema `SARH` no mesmo servidor Oracle (`JFAP.TRF1.GOV.BR`), mesma conexão, usuário `ap20256` tem SELECT. Como `CURRENT_SCHEMA=SICAM`, referenciar com prefixo explícito `SARH.RH_LOTACAO`.

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `LOTA_COD_LOTACAO` | NUMBER | equivale a `TERMO.CO_LOTA` — JOIN key |
| 2 | `LOTA_DSC_LOTACAO` | VARCHAR2 | `Unidade.descricao` — ex: "NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC" |
| 3 | `LOTA_SIGLA_LOTACAO` | VARCHAR2 | sigla — ex: "NUTEC" |
| 4 | `LOTA_DAT_FIM` | DATE | NULL = ativa; filtrar `LOTA_DAT_FIM IS NULL` |

**Uso no SIMAP**: LEFT JOIN em todas as queries principais; `descLotacao` e `siglaLotacao` populados em `SicamTombo`. O sync usa `descLotacao` ao criar `Unidade.descricao` (fallback para o código numérico se NULL).

### `SICAM.FORNECEDOR` — master de fornecedores

**~1.713 linhas, 37 colunas.** Para o SIMAP só importam:

| # | Coluna | Tipo | Mapeamento |
|---|---|---|---|
| 1 | `CO_FORN` | VARCHAR2(14) | PK (FK de TOMBO) |
| 34 | `NO_RAZAO_SOCIAL_FORN` | VARCHAR2(200) | nome oficial |
| 30 | `NO_FANTASIA_FORN` | VARCHAR2(200) | nome fantasia |

**Como `TOMBO.NO_FORN` já está denormalizado, FORNECEDOR não precisa entrar no JOIN principal.**

### `SICAM.UNIDADE_GESTORA` — descartada para SIMAP

**~30 linhas.** Tipos não batem com `PATRIMONIO_SETOR.CO_LOTA` (VARCHAR2 vs NUMBER). É o código orçamentário SIAFI (tipo `090007`), não a lotação de patrimônio.

## Buscas que retornaram zero

- `SECAO` — não existe no schema SICAM. Descrição longa de lotação **não está** no SICAM.
- `ORGAO` — idem.

## Inventário de Views (todas 12 do schema)

Nenhuma view denormalizada útil — não há `V_TOMBO_COMPLETO` ou equivalente:

`CONTRATO_VIEW`, `ENTRADA_MATERIAL_VIW`, `ENTRADA_MATERIAL_VIW_1`, `ENTRADA_MATERIAL_VIW_2`, `FICH_MOVIM_MENSAL`, `MATERIAL_TRF1`, `MOV_SAIDA_DEFINITIVO_V`, `SICAM_VIEW_LICITACAO`, `VIEW_MEDIA_LOTACAO`, `VIEW_SAIDA_MENSAL`, `V_LICITACAO`, `V_MCFCA01`

## JOIN canônico (candidato — pendente validação Round 3)

```sql
SELECT
  t.NU_TOMBO,
  m.DE_MAT          AS DESCRICAO_MATERIAL,
  t.TI_TOMBO,
  t.IN_SAIDA,
  t.CO_FORN,
  t.NO_FORN,
  tr.CO_LOTA        AS COD_LOTACAO,
  tr.CO_SETOR       AS COD_SETOR,
  ps.NO_SETOR       AS NOME_SETOR,
  tr.NU_MATR_RESP_TOMBO AS MATRICULA_RESPONSAVEL,
  tr.NO_RECEB       AS NOME_RESPONSAVEL,
  tr.DT_TERMO,
  tr.FG_ASSINADO
FROM TOMBO t
INNER JOIN MATERIAL m
  ON m.CO_MAT = t.CO_MAT
LEFT JOIN TERMO tr
  ON tr.NU_TERMO = t.NU_TERMO
 AND tr.AN_TERMO = t.AN_TERMO
 AND tr.TI_TERMO = t.TI_TERMO
LEFT JOIN PATRIMONIO_SETOR ps
  ON ps.CO_LOTA  = tr.CO_LOTA
 AND ps.CO_SETOR = tr.CO_SETOR
WHERE t.NU_TOMBO = :nu_tombo
  AND t.TI_TOMBO != 'L'
  AND t.IN_SAIDA = 0;
```

## Round 3 — validações executadas

### `TIPO_TOMBO`

| TI_TOMBO | NO_TOMBO |
|---|---|
| D | DURADOURO |
| I | INCORPORAÇÃO |
| L | **LIVRO** ← filtro do CSV legado exclui livros (gerenciados em módulo separado) |
| T | TOMBO ← tipo padrão (móveis, equipamentos, informática) |
| X | OUTROS |

**Conclusão:** o filtro `TI_TOMBO != 'L'` continua certo, mas a semântica é "excluir livros", não "excluir liquidados".

### `LOTACAO_SICAM_RH` — descartada como master de lotação

Amostra de 10 linhas mostrou:
- Todas com `LOTA_SIGLA_SECAO = 'AP'` (esperado para JFAP)
- `CO_LOTACAO` no formato 100000, 100010, 100020... (estrutura hierárquica)
- `LOTA_COD_LOTACAO` valores não-sequenciais (70, 71, 72, 73, 107, 115, 116, 185, 197, 74)

**Tombo de teste 12423 retornou `TERMO.CO_LOTA = 348`** — não bate com nenhum padrão de `LOTACAO_SICAM_RH.CO_LOTACAO`. **Conclusão**: `LOTACAO_SICAM_RH` usa código de outro sistema. **Descartada.**

### `SARH.RH_LOTACAO` — bridge para descrição de lotação (confirmado 2026-05-13)

Query de validação executada diretamente:
```sql
SELECT rl.LOTA_DSC_LOTACAO AS DSC, rl.LOTA_DAT_FIM AS DAT_FIM
FROM SARH.RH_LOTACAO rl
WHERE rl.LOTA_COD_LOTACAO = 348
```
Resultado: `DSC = "NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC"`, `DAT_FIM = null`. Confirmado `LOTA_COD_LOTACAO = 348 = TERMO.CO_LOTA`. COUNT(*) = 474 linhas.

**Estratégia para SIMAP**: usar `TERMO.CO_LOTA` como `Unidade.codigo`. Para a descrição (`Unidade.descricao`), JOIN com `SARH.RH_LOTACAO` via `LOTA_COD_LOTACAO = tr.CO_LOTA AND LOTA_DAT_FIM IS NULL`. Fallback para o código numérico quando NULL.

### JOIN canônico testado em tombo real

Tombo 12423 (sem filtros de TI_TOMBO/IN_SAIDA) retornou 1 linha completa com 13 colunas. JOIN validado. Observações:

- `NU_TOMBO` retorna como `NUMBER` — precisa cast para string com possível padding de zeros
- `NO_RECEB` veio NULL — **não usar como fonte do nome do responsável**
- `NO_SETOR` continha "SETSIS (BRUNO ALEXANDRE SOARES PRESTES)" — convenção JFAP de embutir nome no setor; **ignorar essa convenção**, parse seria frágil
- `FG_ASSINADO = 'N'` — termo era rascunho mas dados úteis presentes
- `IN_SAIDA = 1` — valor inesperado; ver próxima seção

### `IN_SAIDA` — semântica revisada

`Query 4` com filtro `IN_SAIDA = 0` retornou **0 linhas**. Combinado com o fato de que o tombo 12423 (ativo) tem `IN_SAIDA = 1`, conclui-se:

- `IN_SAIDA = 1` → tombo está **dentro/ativo** (semântica de "indicador de saída SIM = ainda tem"... ou outra interpretação)
- `IN_SAIDA = 0` → tombo **saiu**

**Filtro correto para "tombos ativos no SIMAP": `IN_SAIDA = 1`** (pendente confirmação final via distribuição).

### Estratégia para nome do responsável

`TERMO.NO_RECEB` é nullable e veio null no teste. **Fonte canônica do nome do responsável**: LDAP via [server/services/ldap.ts](../server/services/ldap.ts), usando `TERMO.NU_MATR_RESP_TOMBO` como chave.

Isso é consistente com o padrão existente do SIMAP onde:
- SICAM provê a matrícula (link)
- LDAP/AD provê detalhes da pessoa (nome, e-mail, lotação atual)

### Mapeamento canônico final (Round 3 fechado parcialmente)

| Campo SIMAP | Fonte SICAM | Status |
|---|---|---|
| `Tombo.numero` | `TOMBO.NU_TOMBO` (cast NUMBER→string) | ✓ |
| `Tombo.descricaoMaterial` | `MATERIAL.DE_MAT` via JOIN `CO_MAT` | ✓ |
| `Tombo.tipoTombo` (filtro) | `TOMBO.TI_TOMBO` — descartar `'L'` (livro) | ✓ |
| `Tombo.saida` (filtro) | `TOMBO.IN_SAIDA` — manter `= 1` (ativo) | ⏳ confirmar |
| `Tombo.codigoFornecedor` | `TOMBO.CO_FORN` | ✓ |
| `Tombo.nomeFornecedor` | `TOMBO.NO_FORN` (denormalizado) | ✓ |
| `Unidade.codigo` | `TERMO.CO_LOTA` | ✓ |
| `Unidade.descricao` | cache local SIMAP (não vem do SICAM) | ✓ workaround |
| `Setor.codigo` | `TERMO.CO_SETOR` | ✓ |
| `Setor.nome` | `PATRIMONIO_SETOR.NO_SETOR` (pode ter sufixo "(NOME)" — não fazer parse) | ✓ |
| `Tombo.matriculaResponsavel` | `TERMO.NU_MATR_RESP_TOMBO` | ✓ |
| `Tombo.nomeResponsavel` | **LDAP via matrícula** (`NO_RECEB` é nullable) | ✓ via service existente |

### Distribuição de `IN_SAIDA` (Query 5)

```
IN_SAIDA = 1  →  9.109 tombos (62,3%)  → ATIVO/DENTRO  (este é o filtro do SIMAP)
IN_SAIDA = 2  →  5.510 tombos (37,7%)  → SAÍDA/BAIXA
```

Valores `0` não existem na base. **Filtro canônico: `IN_SAIDA = 1`.**

### Distribuição de `TI_TOMBO` (Query 6)

```
T (TOMBO padrão)      11.370  77,8%
L (LIVRO)              3.177  21,7%   ← excluído do SIMAP
I (INCORPORAÇÃO)          72   0,5%
D (DURADOURO)              0   0%
X (OUTROS)                 0   0%
```

Universo ativo estimado do SIMAP: ~7.000-8.000 tombos (intersecção `TI_TOMBO != 'L'` AND `IN_SAIDA = 1`).

### Tombos com/sem TERMO (Query 7)

```
COM_TERMO:  6.179 tombos (99,98%)  → fluxo principal
SEM_TERMO:      1 tombo (0,02%)    → caso de borda
```

**Decisão**: `buscarTomboSicam` usa LEFT JOIN com TERMO (tolera o 1 tombo sem termo, retorna lotação/setor nulos). `listarTombosPorLotacao` usa INNER JOIN (sem termo não há vínculo de lotação a filtrar, então o caso de borda some — comportamento correto).

`FG_ASSINADO`: **não filtrar**. Vimos um caso real (tombo 12423) com `FG_ASSINADO = 'N'` e dados válidos. O caller (SIMAP) recebe a flag e decide a apresentação.

## Round 4 — queries implementadas

Em [server/queries/sicam.ts](../server/queries/sicam.ts):

- `buscarTomboSicam(numero)` → `SicamTombo | null`
- `listarTombosPorLotacao(codLotacao, { pagina, porPagina })` → `{ tombos, total, pagina, porPagina, totalPaginas }`

### JOIN canônico final

```sql
-- buscarTomboSicam (LEFT JOIN com TERMO; tolera tombo sem vínculo)
SELECT
  TO_CHAR(t.NU_TOMBO) AS NU_TOMBO,
  m.DE_MAT            AS DESCRICAO_MATERIAL,
  t.TI_TOMBO,
  t.CO_FORN,
  t.NO_FORN,
  tr.CO_LOTA          AS COD_LOTACAO,
  tr.CO_SETOR         AS COD_SETOR,
  ps.NO_SETOR         AS NOME_SETOR,
  tr.NU_MATR_RESP_TOMBO AS MATRICULA_RESPONSAVEL,
  tr.DT_TERMO,
  tr.FG_ASSINADO
FROM TOMBO t
  INNER JOIN MATERIAL m       ON m.CO_MAT = t.CO_MAT
  LEFT JOIN  TERMO tr         ON tr.NU_TERMO = t.NU_TERMO
                             AND tr.AN_TERMO = t.AN_TERMO
                             AND tr.TI_TERMO = t.TI_TERMO
  LEFT JOIN  PATRIMONIO_SETOR ps ON ps.CO_LOTA  = tr.CO_LOTA
                                AND ps.CO_SETOR = tr.CO_SETOR
WHERE t.NU_TOMBO  = :nuTombo
  AND t.TI_TOMBO != 'L'   -- exclui livros (módulo separado do SICAM)
  AND t.IN_SAIDA  = 1;    -- exclui baixados (IN_SAIDA=2)
```

`listarTombosPorLotacao` usa o mesmo JOIN mas com INNER JOIN em TERMO + filtro `tr.CO_LOTA = :codLotacao` + paginação via `OFFSET ... FETCH NEXT`.

### Notas para Fases 3 e 4

- **Nome do responsável**: queries retornam apenas a matrícula (`NU_MATR_RESP_TOMBO`). A Fase 3 deve enriquecer com LDAP via [lib/ldap/directory-email.ts](../lib/ldap/directory-email.ts) ou similar.
- **Descrição da lotação**: queries retornam apenas o código (`CO_LOTA`). A Fase 3/4 usa o cache local do SIMAP (`Unidade.descricao` populado por importações CSV anteriores) para exibição.
- **Cast de número**: `NU_TOMBO` é NUMBER no Oracle, string no SIMAP. As queries fazem `TO_CHAR` no SELECT e `Number()` no bind. Tombos com zeros à esquerda no SIMAP são tratados normalizando para o número antes do bind.

## Convenções de filtro

- `tipo = 'L'` → bem liquidado, **excluir** do espelho local.
- `saida = 'SAIU'` → bem deixou a unidade, **excluir** das listagens (mas pode aparecer em histórico).
- Estes filtros são aplicados pelo [csv-parser.ts](../server/services/csv-parser.ts) hoje. Devem migrar para o WHERE clause das queries Oracle.

## Notas de qualidade de dados

> Preencher conforme descobertas durante a validação:

- Encoding: o driver oracledb retorna strings já decodificadas (NLS_LANG configurado pelo Instant Client). O CSV legado era Latin-1 — esperam-se acentos corretos via Oracle nativo.
- NULLs: pendente catalogação (responsável pode ser NULL? fornecedor é opcional?)
- Trimming: pendente verificar se strings vêm com espaços à direita (CHAR vs VARCHAR2).

## Próximos passos

1. Round 1: usar `/admin/sicam` para encontrar candidatos das 5 entidades (tombo, unidade, setor, responsável, fornecedor) e suas possíveis views denormalizadas (`V_*`, `VW_*`).
2. Round 2: copiar para este doc as colunas de cada candidato confirmado.
3. Round 3: redigir SQL de teste validado contra um tombo conhecido importado via CSV.
4. Round 4: codar [server/queries/sicam.ts](../server/queries/sicam.ts) com `buscarTomboSicam`, `buscarLotacaoAtual`, `listarTombosPorLotacao`.

## Round 5 — descoberta da fonte para histórico de transferências

**Feature concluída (2026-05-12).**

### Investigação de schema

**SICAM.TERMO (15 colunas):** NÃO possui coluna `NU_TOMBO`. Colunas confirmadas: `NU_TERMO`, `AN_TERMO`, `TI_TERMO`, `DT_TERMO`, `CO_LOTA`, `CO_SETOR`, `NU_MATR_RESP_TOMBO`, `FG_ASSINADO`, `NO_RECEB` + 6 não-relevantes para SIMAP. A FK é invertida: o TOMBO aponta para o TERMO via `NU_TERMO/AN_TERMO/TI_TERMO`, não o contrário.

**SICAM.HISTORICO_TERMO:** Tabela de auditoria de TERMO (trigger). Mesma estrutura que TERMO + coluna `TIPO_OPERACAO`. Também sem `NU_TOMBO` — não é a fonte correta.

**SICAM.HISTORICO_ITEM_TERMO (30 colunas — fonte correta):** Registra o histórico de transferências de responsabilidade de itens. Coluna 1 = `NU_TOMBO NOT NULL` (referência direta ao tombo). Colunas relevantes:

| Coluna | Tipo | Mapeamento Prisma |
|---|---|---|
| `NU_TOMBO` | NUMBER | filtro/chave de agrupamento |
| `FG_TRANSFERENCIA` | CHAR(1) | **sempre NULL** nesta instalação — filtro removido; todos os registros são eventos válidos |
| `CO_LOTA_TRANSF` | NUMBER | `HistoricoTermoSicam.codLotacaoDestino` |
| `CO_SETOR_TRANSF` | NUMBER | `HistoricoTermoSicam.codSetorDestino` |
| `NU_MATR_TRANSF` | VARCHAR2 | `HistoricoTermoSicam.matriculaTransf` |
| `DT_TOMBO` | DATE NOT NULL | `HistoricoTermoSicam.dtTransferencia` — **col correta; DT_CRIACAO é NULL em 91% dos registros** |

Nome do setor via JOIN: `PATRIMONIO_SETOR.NO_SETOR ON CO_LOTA = CO_LOTA_TRANSF AND CO_SETOR = CO_SETOR_TRANSF` → `HistoricoTermoSicam.nomeSetorDestino`.

### Query de sync implementada

```sql
SELECT
  TO_CHAR(hit.NU_TOMBO)   AS NU_TOMBO,
  hit.DT_TOMBO            AS DT_TRANSFERENCIA,
  hit.CO_LOTA_TRANSF      AS COD_LOTACAO_DESTINO,
  hit.CO_SETOR_TRANSF     AS COD_SETOR_DESTINO,
  hit.NU_MATR_TRANSF      AS MATRICULA_TRANSF,
  ps.NO_SETOR             AS NOME_SETOR_DESTINO
FROM HISTORICO_ITEM_TERMO hit
  LEFT JOIN PATRIMONIO_SETOR ps
    ON ps.CO_LOTA  = hit.CO_LOTA_TRANSF
   AND ps.CO_SETOR = hit.CO_SETOR_TRANSF
WHERE hit.NU_TOMBO IN (<placeholders>)
ORDER BY TO_CHAR(hit.NU_TOMBO), hit.DT_TOMBO DESC NULLS LAST
```

Sub-lotes de 100 por roundtrip (limite IN clause Oracle ORA-01795). Implementado em `buscarHistoricoTermosBatch` em [server/queries/sicam.ts](../server/queries/sicam.ts).

### Modelo Prisma resultante

`HistoricoTermoSicam` com chave única `@@unique([tomboId, dtTransferencia])` — cada evento de transferência é identificado pelo tombo + data. Sync faz upsert via essa chave.

### Resultado da validação end-to-end (2026-05-12)

**Contagem real (COUNT, não estatísticas Oracle):**

| Métrica | Valor |
|---|---|
| Total linhas em HISTORICO_ITEM_TERMO | 687 |
| Tombos distintos com histórico | 230 |
| **Tombos ATIVOS (IN_SAIDA=1, TI_TOMBO≠'L') com histórico** | **1** |
| Linhas com DT_TOMBO não-nulo | 687 (100%) |
| Linhas com DT_DOC_ENTR não-nulo | 687 (100%) |
| Linhas com DT_CRIACAO não-nulo | 60 (9%) |

**Conclusão:** O sync está correto. Apenas 1 tombo ativo tem registros em `HISTORICO_ITEM_TERMO`; os outros 229 tombos com histórico são tombos já baixados (`IN_SAIDA=2`) ou livros (`TI_TOMBO='L'`). A feature "Histórico SICAM" na página do tombo funciona e exibe o empty state corretamente para tombos sem histórico de transferência.
