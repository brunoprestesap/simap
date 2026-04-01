# Onda 2 — Operacional (SEMAP + Patrimônios + Admin)

Implemente as funcionalidades operacionais do SIMAP. A Onda 1 já está completa. Consulte @CLAUDE.md e @docs/VISUAL_PROMPT.md.

## Tarefas (executar em ordem)

### 2.1 — Backlog da SEMAP
- Crie `app/(dashboard)/backlog/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.9
- Crie `components/views/BacklogList.tsx` ('use client'):
  - Barra de filtros: dropdown status (Pendente, Confirmada, Todas), date range picker, dropdown unidade com busca, botão "Limpar filtros"
  - Controle de ordenação (data mais recente/antiga, unidade, status)
  - Lista de cards modulares: nº movimentação + data, origem → destino, qtd tombos, StatusBadge, técnico, botão "Registrar no SICAM" (habilitado só se status = CONFIRMADA_ORIGEM)
  - Paginação: scroll infinito mobile, numérica desktop
  - Estado vazio: EmptyState "Tudo em dia! Nenhuma movimentação pendente."
- Crie `server/queries/backlog.ts`: query paginada com filtros (status, período, unidadeId) usando Prisma. Inclua contagem total para paginação
- Use URL search params (useSearchParams) para persistir filtros na URL

### 2.2 — Formulário de Registro SICAM
- Crie `components/views/RegistroSicamSheet.tsx` ('use client'): conforme @docs/VISUAL_PROMPT.md Seção 9.10
  - Sheet lateral (desktop 480px) / fullscreen (mobile)
  - Dados da movimentação no topo (somente leitura)
  - Campo "Nº Protocolo SICAM" (texto, obrigatório)
  - Campo "Data do Registro" (date picker, obrigatório, validação: não pode ser futura)
  - Campo "Observações" (textarea, opcional, max 500 chars)
  - Botões "Confirmar Registro" (primário) + "Cancelar"
  - Validação com Zod
- Crie Server Action `server/actions/registro-sicam.ts`:
  - Valida perfil SEMAP
  - Atualiza Movimentacao: status→REGISTRADA_SICAM, protocoloSicam, dataRegistroSicam, observacoesSicam, registradoSicamPorId
  - Registra AuditLog
  - Cria Notificacao para o técnico e servidores responsáveis (origem + destino)
  - Atualiza lotação dos tombos na tabela Tombo (unidadeId → unidadeDestinoId da movimentação)
- Após sucesso: toast "Registrado no SICAM com sucesso", item sai da lista

### 2.3 — Visualização de Patrimônios
- Crie `app/(dashboard)/patrimonio/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.8
- Crie `components/views/PatrimonioList.tsx` ('use client'):
  - Header com nome da unidade do usuário logado
  - Card de alerta (amarelo) se houver movimentações pendentes de confirmação, com link direto
  - Barra de busca (nº tombo ou descrição) com debounce 300ms
  - Chips de filtro: Todos, Presentes, Em movimentação
  - Lista: cards (mobile) / tabela (desktop) com nº tombo, descrição, setor, status
  - Estado vazio: EmptyState "Nenhum patrimônio vinculado à sua unidade."
- Crie `server/queries/patrimonio.ts`: query por servidorResponsavelId com busca (ILIKE), filtro por status, paginação server-side

### 2.4 — CRUD Administrativo: Unidades e Setores
- Crie `app/(dashboard)/admin/unidades/page.tsx` e `app/(dashboard)/admin/setores/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.11
- Padrão CRUD por entidade:
  - DataTable (TanStack Table) com busca + botão "Nova Unidade" / "Novo Setor"
  - Sheet/modal de criação e edição com formulário validado por Zod
  - Ação "Desativar" (ativo→false) com modal de confirmação. Nunca deletar.
  - Tabs ou submenu para navegar entre entidades admin
- Crie Server Actions em `server/actions/admin.ts`: criarUnidade, editarUnidade, desativarUnidade, criarSetor, editarSetor, desativarSetor
- Proteja por perfil: somente GESTOR_ADMIN e SERVIDOR_SEMAP
- Registre AuditLog para todas as operações

### 2.5 — CRUD Administrativo: Servidores Responsáveis
- Crie `app/(dashboard)/admin/responsaveis/page.tsx`
- DataTable de servidores: matrícula, nome, unidade vinculada, status
- Sheet de edição: vincular/desvincular servidor a uma unidade, editar dados
- Server Actions: editarServidor, vincularServidorUnidade

### 2.6 — CRUD Administrativo: Perfis de Acesso
- Crie `app/(dashboard)/admin/perfis/page.tsx`
- DataTable de usuários com perfil atual
- Sheet de edição: atribuir perfil (TECNICO_TI, SERVIDOR_RESPONSAVEL, SERVIDOR_SEMAP, GESTOR_ADMIN) ao usuário
- Server Actions: atribuirPerfil
- Proteção: somente GESTOR_ADMIN

### 2.7 — Central de Notificações
- Crie `components/common/NotificationBell.tsx` ('use client'): atualizar o placeholder da Fase 0
  - Ícone sino (lucide Bell) com badge numérico (contagem de não lidas)
  - Desktop: clica e abre Popover com lista de notificações
  - Mobile: navega para /notificacoes
  - Polling a cada 30s para atualizar contagem (SWR ou React Query)
- Crie `app/(dashboard)/notificacoes/page.tsx`: versão fullscreen mobile conforme @docs/VISUAL_PROMPT.md Seção 9.12
- Crie `components/views/NotificationList.tsx`:
  - Lista cronológica reversa
  - Cada item: ícone por tipo (lucide), texto, data/hora relativa, fundo #D6E4F0 (não lida) ou branco (lida)
  - Botão "Marcar todas como lidas"
  - Click: marca como lida + navega para o link da notificação
- Crie Server Actions: marcarComoLida, marcarTodasComoLidas
- Crie `server/queries/notificacoes.ts`: busca por usuarioDestinoId, ordenada por createdAt desc, com contagem de não lidas

### 2.8 — Histórico de Movimentações
- Crie `app/(dashboard)/movimentacao/historico/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.13
- DataTable com filtros completos: período (date range), unidade (dropdown com busca), responsável, status
- Paginação server-side
- Link para detalhe de cada movimentação
- Crie `app/(dashboard)/movimentacao/[id]/page.tsx`: conforme @docs/VISUAL_PROMPT.md Seção 9.5
  - Card com dados completos
  - Timeline visual de status (Registrada → Confirmada → SICAM) com datas
  - Lista de tombos da movimentação
  - Dados de auditoria
- Acessível por todos os perfis autenticados

### 2.9 — Testes da Onda 2
- **Unitários:** validações Zod dos formulários CRUD, lógica de filtros do backlog
- **Integração:** Server Actions de registro SICAM, CRUD admin (criar, editar, desativar), notificações (criar, marcar lida)
- **E2E (Playwright):**
  - Backlog SEMAP: filtrar pendentes → abrir sheet → registrar com protocolo → verificar status atualizado
  - CRUD admin: criar unidade → editar → desativar → verificar na lista
  - Notificações: verificar badge → abrir → marcar como lida

## Critério de conclusão da Onda 2
- [ ] Backlog SEMAP funcional com filtros e registro no SICAM
- [ ] CRUD completo de unidades, setores, responsáveis e perfis
- [ ] Meus Patrimônios exibe tombos do responsável logado com busca e filtros
- [ ] Central de notificações com polling e marcação de lidas
- [ ] Histórico de movimentações com filtros e detalhe
- [ ] Todos os testes passando
