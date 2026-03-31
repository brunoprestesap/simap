# Domínio: Gestão Patrimonial da JFAP

## Contexto do negócio

A Justiça Federal do Amapá (JFAP) é uma seção judiciária vinculada ao TRF1. A gestão de bens patrimoniais é feita pela SEMAP (Seção de Material e Patrimônio) no sistema SICAM, que é mantido pelo TRF1 e não possui API de integração.

## Vocabulário do domínio

- **Tombo**: Identificador único de um bem patrimonial (ex.: 12542). Representado por código de barras Code 128 fixado fisicamente no bem.
- **Lotação**: Unidade organizacional onde o tombo está registrado (ex.: "SECRETARIA DA 5ª VARA"). Identificada por código numérico.
- **Setor**: Subdivisão dentro de uma lotação (ex.: "Sala de audiência"). Identificado por código numérico.
- **Responsável**: Servidor público vinculado a uma lotação, identificado por matrícula funcional (ex.: "AP20154"). O responsável responde pelos tombos em sua lotação.
- **Movimentação**: Transferência de um ou mais tombos de uma lotação de origem para uma lotação de destino. Executada fisicamente por um técnico de TI.
- **SICAM**: Sistema de Controle de Almoxarifado e Material. Sistema legado do TRF1 sem API. Dados extraídos via CSV.
- **SEMAP**: Seção de Material e Patrimônio. Única área com acesso ao SICAM. Responsável pelo registro oficial das movimentações.

## Fluxo de movimentação (ciclo completo)

1. Técnico TI recebe demanda para movimentar equipamentos
2. Técnico escaneia código de barras dos tombos via dispositivo móvel
3. Técnico seleciona unidade de destino e confirma o registro
4. Sistema envia e-mail ao responsável da ORIGEM com link de confirmação (token)
5. Sistema envia e-mail informativo ao responsável do DESTINO
6. Responsável da origem acessa link público e confirma a saída (sem login)
7. Movimentação aparece no backlog da SEMAP
8. Servidor SEMAP registra a movimentação no SICAM e confirma na aplicação (protocolo + data + observações)

## Status da movimentação

- **Pendente de Confirmação**: registrada pelo técnico, aguardando confirmação do responsável da origem
- **Confirmada pela Origem**: responsável confirmou via link público
- **Registrada no SICAM**: SEMAP confirmou o registro no sistema legado
- **Não Confirmada**: prazo de confirmação expirou sem resposta (movimentação segue para SEMAP com flag)

## Campos do CSV do SICAM utilizados

O CSV exportado do SICAM tem 38 colunas. A aplicação extrai apenas 11:
Número Tombo, Descrição Material, Código Fornecedor, Nome Fornecedor, Código Lotação, Descrição Lotação, Código Setor, Nome Setor, Matrícula Responsável, Nome Responsável, Saída.

Características técnicas do CSV: delimitador ponto e vírgula (;), encoding Latin-1 (ISO-8859-1), ~12.000 registros.

## Regras de negócio importantes

- Um tombo pertence a exatamente uma lotação por vez.
- A movimentação altera a lotação do tombo na aplicação (não no SICAM — isso é feito manualmente pela SEMAP).
- A confirmação da saída é binária: confirma todos os tombos ou não confirma nenhum.
- O responsável do destino recebe apenas notificação informativa, sem necessidade de confirmação.
- Registros de auditoria são imutáveis e permanentes.
- A importação CSV é upsert por Número do Tombo (chave única).
