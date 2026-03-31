# Onda 1 — Core (Registro + Comunicação)

Implemente o fluxo principal do PATRIMOVE. Consulte @CLAUDE.md para regras e @docs/VISUAL_PROMPT.md para design. O domínio está em .claude/skills/patrimove-domain/SKILL.md.

## Tarefas (executar em ordem)

### 1.1 — Autenticação LDAP/AD
- Configure NextAuth v5 em `lib/auth.ts` com provider Credentials que valida contra LDAP
- Crie o middleware em `middleware.ts` que protege todas as rotas em `/(dashboard)` e redireciona para `/login` se não autenticado
- A sessão JWT deve conter: id, matricula, nome, perfil (PerfilUsuario)
- Crie `app/(auth)/login/page.tsx`: card centralizado com logo JF + PATRIMOVE, campos matrícula e senha, botão "Entrar", estados (inicial, carregando com spinner, erro credenciais, erro LDAP). Veja specs em @docs/VISUAL_PROMPT.md Seção 9.1
- Para desenvolvimento local, crie um provider de fallback que autentica contra os usuários do seed (sem LDAP real)
- Após login, redirecione para a home conforme o perfil: Técnico→/home, Responsável→/patrimonio, SEMAP→/backlog, Gestor→/dashboard

### 1.2 — Importação CSV do SICAM
- Crie `server/services/csv-parser.ts`: parse do CSV Latin-1 com delimitador ";", extração dos 11 campos, validação com Zod, retorno de { registros, erros }
- Crie Server Action `server/actions/importacao.ts`: recebe FormData com arquivo, processa, faz upsert por numeroTombo, cria registro em ImportacaoCSV, cria Notificacao para SEMAP
- Crie `app/(dashboard)/importacao/page.tsx`: fluxo de 3 etapas com stepper visual. Veja specs em @docs/VISUAL_PROMPT.md Seção 9.7
  - Etapa 1: drag-and-drop + botão "Selecionar arquivo" (aceita .csv)
  - Etapa 2: 4 cards resumo (total, novos, atualizados, erros) + tabela prévia (10 primeiros) + lista de erros
  - Etapa 3: barra de progresso + resumo final + botão "Concluir"
- Crie testes unitários para o csv-parser: CSV válido, encoding errado, campos faltando, delimitador errado

### 1.3 — Scanner de Código de Barras
- Crie `components/common/Scanner.tsx` ('use client'): integração com @zxing/library para Code 128, usando getUserMedia. Viewfinder com guia retangular, overlay semitransparente. Emite evento onScan(codigo) e onError(msg). Feedback: vibração (navigator.vibrate) ao detectar código.
- Crie `components/views/MovimentacaoForm.tsx` ('use client'): tela de nova movimentação conforme @docs/VISUAL_PROMPT.md Seção 9.3
  - Layout mobile: scanner (60% superior) + bottom sheet com lista de tombos (40% inferior)
  - Layout desktop: 2 colunas (scanner esquerda, lista direita)
  - Botão "Digitar manualmente": alterna para input numérico
  - Lista de tombos escaneados: cada item com nº tombo (bold), descrição (truncada), lotação, ícone X remover
  - Badge contador "N tombos escaneados"
  - Ao escanear: busca o tombo no banco via Server Action, adiciona à lista com animação slide-in
  - Validações: tombo não encontrado (toast erro), tombo duplicado (toast info), tombo já em movimentação pendente (toast aviso)
  - Botão "Avançar" fixo na parte inferior, disabled quando lista vazia

### 1.4 — Registro da Movimentação
- Crie `components/views/ConfirmacaoMovimentacao.tsx`: tela de resumo/confirmação conforme @docs/VISUAL_PROMPT.md Seção 9.4
  - Card resumo: Origem → Destino (com nomes das unidades e ícone seta)
  - Dropdown com busca para selecionar unidade de destino (shadcn Combobox, carrega todas ~50 unidades client-side)
  - Lista de tombos selecionados
  - Info automática: técnico logado, data/hora
  - Botão "Confirmar Movimentação" + "Voltar"
- Crie Server Action `server/actions/movimentacao.ts`:
  - Cria Movimentacao com status PENDENTE_CONFIRMACAO
  - Cria ItemMovimentacao para cada tombo
  - Gera tokenConfirmacao (crypto.randomUUID()) com validade TOKEN_EXPIRY_DAYS
  - Registra AuditLog
  - Dispara envio de e-mails (fire-and-forget)
  - Retorna { success, movimentacaoId }
- Após confirmação: tela de sucesso com ícone check (animação pulse) + botão "Nova Movimentação"
- Crie `app/(dashboard)/movimentacao/nova/page.tsx` que orquestra Scanner → Confirmação

### 1.5 — Envio de E-mails
- Crie `server/services/email.ts`: configuração Nodemailer com SMTP do .env
- Crie `server/services/email-templates.ts`: 2 templates HTML responsivos
  - **E-mail de saída (origem):** "Movimentação Patrimonial - Confirmação de Saída". Contém: lista de tombos, origem, destino, técnico, data. Link com token: `${APP_URL}/confirmar/${token}`. CTA "Confirmar Saída" destacado.
  - **E-mail de entrada (destino):** "Movimentação Patrimonial - Entrada de Tombos". Informativo, sem link de confirmação. Contém: lista de tombos, origem, data.
- O envio deve consultar o LDAP para obter o e-mail do responsável usando a matrícula do servidor (via server/services/ldap.ts). Para dev local, usar e-mails fictícios do seed.
- Crie `server/services/ldap.ts`: busca de e-mail por matrícula no LDAP. Para dev local, retorna e-mail do banco de dados.

### 1.6 — Página Pública de Confirmação
- Crie `app/confirmar/[token]/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.6
  - Server Component que busca a movimentação pelo token
  - Estados: token válido (exibe dados), token expirado (mensagem "Este link expirou"), já confirmado (mensagem com data/hora)
  - Layout público: header simples com logo PATRIMOVE, sem sidebar/nav
  - Card com: lista de tombos, origem → destino, técnico, data
  - Botão "Confirmar Saída" → modal de confirmação ("Você confirma a saída de N tombos?")
  - Server Action de confirmação: atualiza status para CONFIRMADA_ORIGEM, registra confirmadoEm e confirmadoPorNome, cria AuditLog, cria Notificacao para técnico
  - Após confirmação: tela de sucesso "Movimentação confirmada com sucesso"

### 1.7 — Home do Técnico de TI
- Crie `app/(dashboard)/home/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.2
  - Server Component com dados reais do banco
  - Saudação "Olá, [Nome]"
  - CTA "Nova Movimentação" (card grande com ícone Scanner)
  - 3 KPI cards: movimentações hoje, pendentes de confirmação, registradas no SICAM
  - Lista de movimentações recentes do técnico logado (cards com status badge)
  - Estado vazio com EmptyState
- Crie `components/common/StatusBadge.tsx`: badge colorido por status (Pendente: amarelo, Confirmada: azul, Registrada SICAM: verde, Não Confirmada: vermelho)
- Crie `components/common/EmptyState.tsx`: ilustração SVG simples + mensagem + CTA opcional

### 1.8 — Auditoria
- Crie `server/services/audit.ts`: função `registrarAuditoria(acao, entidade, entidadeId, usuarioId, detalhes?)` que insere na tabela AuditLog
- Integre nas Server Actions de movimentação (1.4) e confirmação (1.6) — se ainda não estiver integrado
- IMPORTANTE: a tabela AuditLog é append-only. Nunca crie funções de update ou delete.

### 1.9 — Testes da Onda 1
Crie testes para os fluxos críticos:
- **Unitários (Vitest):** csv-parser (CSV válido, inválido, encoding), validações Zod dos formulários, geração de token, formatação de dados
- **Integração (Vitest):** Server Action de movimentação (criação, validações), Server Action de importação CSV, Server Action de confirmação pública
- **E2E (Playwright):** 
  - Login → redirecionamento por perfil
  - Importação CSV completa (3 etapas)
  - Nova movimentação com input manual → seleção destino → confirmação
  - Confirmação pública via token (válido, expirado, já confirmado)

## Critério de conclusão da Onda 1
- [ ] Login funcional com redirecionamento por perfil
- [ ] Importação CSV processa arquivo real do SICAM corretamente
- [ ] Scanner lê Code 128 (testar com input manual se câmera indisponível)
- [ ] Movimentação registrada com e-mails enviados (verificar logs no dev)
- [ ] Página pública de confirmação funciona com token válido/expirado
- [ ] Home do técnico exibe dados reais
- [ ] AuditLog registra todas as ações
- [ ] Todos os testes passando
