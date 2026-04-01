# PATRIMOVE — Especificações de UX & UI

**Versão 1.0 | Março 2026 | JFAP — Núcleo de TI**

---

## 1. Arquitetura da Informação

### 1.1 Mapa de Telas

| Módulo | Tela | Perfis com Acesso | Prioridade |
|--------|------|--------------------|------------|
| Auth | Login (LDAP/AD) | Todos | Alta |
| Auth | Página pública de confirmação (token) | Externo (sem login) | Alta |
| Home | Dashboard do Técnico de TI | Técnico TI | Alta |
| Home | Dashboard do Servidor Responsável | Servidor Responsável | Alta |
| Home | Backlog de Pendências (home SEMAP) | Servidor SEMAP | Alta |
| Home | Dashboard Gerencial (home Gestor) | Gestor/Admin | Alta |
| Movimentação | Nova Movimentação (scanner) | Técnico TI | Alta |
| Movimentação | Detalhe da Movimentação | Todos (autenticados) | Alta |
| Movimentação | Histórico de Movimentações | Todos (autenticados) | Média |
| Patrimônio | Meus Patrimônios (por unidade) | Servidor Responsável | Alta |
| SEMAP | Backlog de Pendências | Servidor SEMAP | Alta |
| SEMAP | Registrar Confirmação SICAM | Servidor SEMAP | Alta |
| Importação | Upload e Importação CSV | Técnico TI, SEMAP | Alta |
| Dashboard | Dashboard Gerencial | Gestor/Admin | Alta |
| Notificações | Central de Notificações | Todos (autenticados) | Média |
| Admin | CRUD (unidades, setores, responsáveis, perfis) | Gestor/Admin, SEMAP | Média |

### 1.2 Navegação Híbrida

**Mobile (< 768px) — Bottom Navigation (4 tabs por perfil):**

| Perfil | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|--------|-------|-------|-------|-------|
| Técnico TI | Home | Nova Movimentação | Importação CSV | Notificações |
| Servidor Responsável | Meus Patrimônios | Movimentações | Notificações | Perfil |
| Servidor SEMAP | Backlog | Importação CSV | Notificações | Perfil |
| Gestor/Admin | Dashboard | Movimentações | Notificações | Perfil |

**Desktop (≥ 768px) — Sidebar** colapsável (240px expandida, 64px colapsada). Mesmos itens contextualizados por perfil.

### 1.3 Zonas de Layout

**Mobile:** Header (logo + título + sino) → Conteúdo scrollável → FAB (ação principal) → Bottom nav (fixo)

**Desktop:** Sidebar (esquerda) → Header (breadcrumb + título + sino + avatar) → Conteúdo (max-width 1280px)

### 1.4 Breakpoints

| Breakpoint | Faixa | Layout | Navegação |
|-----------|-------|--------|-----------|
| Mobile | < 768px | Coluna única | Bottom tabs + header compacto |
| Tablet | 768px - 1024px | Grid 2 colunas | Sidebar colapsada + header |
| Desktop | > 1024px | Grid 2-3 colunas | Sidebar expandida + header |

---

## 2. Fluxos de Usuário Principais

### 2.1 Fluxo: Nova Movimentação (Técnico TI)

| Passo | Ação do Usuário | Resposta do Sistema | Estado da Tela |
|-------|----------------|--------------------|----|
| 1 | Toca "Nova Movimentação" | Abre tela do scanner com câmera ativa | Scanner ativo, lista vazia |
| 2 | Posiciona câmera sobre Code 128 | Lê código, busca tombo, feedback sonoro/vibração | Tombo aparece na lista |
| 3 | Repete para cada tombo | Lista cresce, contador atualiza | Badge "N tombos" |
| 3a | Toca "Digitar manualmente" | Teclado numérico abre | Campo de busca visível |
| 4 | Revisa lista, remove indevidos (swipe/X) | Remove da lista | Lista atualizada |
| 5 | Toca "Avançar" | Exibe dropdown busca de destino | Seletor de destino em foco |
| 6 | Seleciona unidade destino | Exibe resumo completo | Tela de confirmação |
| 7 | Toca "Confirmar Movimentação" | Registra, envia e-mails, feedback sucesso | Tela de sucesso |

**Caminhos de erro:**
- Código ilegível → toast "Não foi possível ler. Tente novamente ou digite manualmente."
- Tombo não encontrado → toast "Tombo Nº XXXXX não encontrado."
- Tombo duplicado → toast info "Tombo já está na lista."
- Sem conexão → banner persistente "Sem conexão."
- Lista vazia ao avançar → botão "Avançar" desabilitado

### 2.2 Fluxo: Confirmação pelo Responsável (Página Pública)

1. Responsável recebe e-mail com link
2. Clica no link com token → página pública carrega
3. Visualiza: tombos, origem, destino, técnico, data
4. Toca "Confirmar Saída" → modal "Você confirma a saída de N tombos?"
5. Confirma → tela de sucesso

**Estados especiais:** Token expirado → mensagem de erro. Já confirmado → mensagem com data/hora.

### 2.3 Fluxo: Registro no SICAM (SEMAP)

1. SEMAP acessa backlog → lista de pendentes com filtros
2. Filtra por status/data/unidade
3. Clica em movimentação → abre detalhe
4. Preenche: Nº Protocolo SICAM, Data, Observações
5. Confirma → status atualizado, sai da lista

### 2.4 Fluxo: Importação CSV

Fluxo em 3 etapas visuais com stepper:
1. **Upload:** drag-and-drop + botão, aceita .csv
2. **Pré-visualização:** resumo (total, novos, atualizados, erros) + tabela prévia + lista de erros
3. **Confirmação:** barra de progresso + resumo final

---

## 3. Especificações de Telas

### 3.1 Login
- Centralizado vertical/horizontal, card com logo JF + PATRIMOVE, campos matrícula/senha, botão "Entrar"
- Estados: inicial (foco em matrícula), carregando (spinner), erro credenciais (borda vermelha), erro LDAP (banner)

### 3.2 Home do Técnico de TI
- Saudação "Olá, [Nome]" + sino notificações
- CTA "Nova Movimentação" (card grande, ícone scanner, largura total mobile)
- 3 cards métricas: hoje / pendentes (amarelo) / registradas SICAM (verde)
- Lista movimentações recentes (cards com status badge)
- Estado vazio: ilustração + mensagem amigável

### 3.3 Nova Movimentação (Scanner)
- **Mobile:** scanner 60% superior (viewfinder + guia retangular + overlay) → botão "Digitar manualmente" → bottom sheet 40% (lista tombos, swipe-to-delete) → badge contador → botão "Avançar" fixo
- **Desktop:** 2 colunas (scanner esquerda, lista direita)
- Estados: inicial, escaneando, tombo adicionado (slide-in + vibração), erro, entrada manual, pronto

### 3.4 Confirmação da Movimentação
- Card resumo: Origem → Destino (seta), dropdown busca destino (Combobox)
- Lista tombos, info automática (técnico, data), botões Confirmar + Voltar
- Pós: tela sucesso com check animado + "Nova Movimentação"

### 3.5 Meus Patrimônios
- Header com unidade, card alerta pendências (amarelo), busca (debounce 300ms), chips filtro, lista patrimônios
- Estado vazio com ilustração

### 3.6 Backlog SEMAP
- Filtros: status dropdown, date range, unidade dropdown busca, "Limpar filtros"
- Ordenação: data, unidade, status
- Cards modulares: nº + data, origem → destino, qtd tombos, status badge, técnico, botão "Registrar no SICAM"
- Paginação: scroll infinito (mobile), numérica (desktop)
- Estado vazio com ilustração

### 3.7 Formulário Registro SICAM
- Sheet lateral (desktop 480px) / fullscreen (mobile)
- Campos: Nº Protocolo (obrigatório), Data Registro (obrigatório, não futura), Observações (opcional, max 500)
- Botões: Confirmar Registro + Cancelar

### 3.8 Dashboard Gerencial
- **KPIs em destaque (3 cards):** tempo médio registro SICAM (número + tendência), pendentes SICAM (contador + link backlog, borda amarela), pendentes confirmação (contador, borda azul)
- Gráfico barras/linha: movimentações por período (seletor dia/semana/mês)
- Distribuição por unidade organizacional
- Tabela relatórios de auditoria (filtros + paginação)
- Cada seção com Suspense + skeleton independente

### 3.9 Central de Notificações
- Popover (desktop) / tela cheia (mobile). Lista cronológica reversa.
- Cada item: ícone por tipo, texto, data/hora relativa, fundo azul claro (não lida) / branco (lida)
- Tipos: saída, entrada, confirmação, registro SICAM, importação CSV
- Botão "Marcar todas como lidas". Badge no sino do header.

### 3.10 CRUD Administrativo
- Rotas: /admin/unidades, /admin/setores, /admin/responsaveis, /admin/perfis
- Padrão: DataTable + busca + botão "Novo", sheet criação/edição com Zod, desativar (sem deletar), tabs entre entidades
- Acesso: Gestor/Admin e SEMAP

---

## 4. Padrões de Interação

### 4.1 Inputs e Controles

| Componente | Comportamento | Feedback |
|-----------|--------------|----------|
| Scanner (câmera) | Câmera traseira auto, foco contínuo, Code 128 | Som + vibração ao detectar |
| Input manual tombo | Numérico, busca ao Enter/Adicionar | Spinner durante busca, toast resultado |
| Dropdown com busca | Lista filtrada conforme digitação | Empty: "Nenhuma unidade encontrada" |
| Botões primários | Azul #003366; estados: default, hover, active, disabled, loading | Loading: spinner; disabled: opacidade 50% |
| Chips de filtro | Toggle on/off | Ativo: fundo azul + texto branco |
| Swipe-to-delete | Swipe esquerda revela "Remover" (mobile) | Slide-out + undo via toast |

### 4.2 Feedback

| Tipo | Uso | Duração | Posição |
|------|-----|---------|---------|
| Toast sucesso | Ação concluída | 3s, dismissível | Topo (mobile), canto superior direito (desktop) |
| Toast erro | Falha | 5s, dismissível | Topo |
| Banner persistente | Erro de sistema | Até resolução | Fixo abaixo do header |
| Modal confirmação | Ações irreversíveis | Até ação do usuário | Centralizado com overlay |
| Skeleton/Shimmer | Carregamento | Até conclusão | Inline |
| Vibração + som | Leitura de código OK | Instantâneo | Dispositivo |

### 4.3 Transições

| Transição | Animação | Duração |
|----------|----------|---------|
| Navegação entre telas | Slide horizontal (mobile), fade (desktop) | 200ms |
| Bottom sheet | Drag-to-expand, snaps 40%/80% | Gesture |
| Adicionar tombo | Slide-in direita + fade-in | 300ms |
| Remover tombo | Slide-out esquerda + fade-out | 200ms |
| Tela de sucesso | Check com pulse | 500ms |
| Toasts | Slide-down entrada, fade-out saída | 3-5s |

---

## 5. Design System

### 5.1 Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| Primária | #003366 | Botões primários, sidebar, links, headers |
| Secundária | #2D6E2D | Sucesso, "Registrada SICAM", H3 |
| Azul Claro | #D6E4F0 | Hover, notificações não lidas |
| Amarelo | #D4A017 | Pendência, atenção |
| Vermelho | #CC3333 | Erro, destrutivo |
| Fundo | #F2F2F2 | Background de telas |
| Superfície | #FFFFFF | Cards, modais |
| Texto principal | #333333 | Corpo |
| Texto secundário | #666666 | Labels, placeholders |

Sem gradientes. Visual chapado e institucional.

### 5.2 Tipografia

| Elemento | Font | Tamanho | Peso | Cor |
|----------|------|---------|------|-----|
| H1 | Inter | 24px/1.5rem | Bold 700 | #003366 |
| H2 | Inter | 20px/1.25rem | Semibold 600 | #003366 |
| H3 | Inter | 18px/1.125rem | Semibold 600 | #2D6E2D |
| Body | Inter | 16px/1rem | Regular 400 | #333333 |
| Body small | Inter | 14px/0.875rem | Regular 400 | #666666 |
| Caption | Inter | 12px/0.75rem | Medium 500 | #666666 |
| KPI | Inter | 32px/2rem | Bold 700 | #333333 |

Fallback: Century Gothic, Calibri, sans-serif

### 5.3 Componentes shadcn/ui

| Componente | Uso | Customização |
|-----------|-----|-------------|
| Button | CTAs, ações | primary (#003366), secondary (outline), destructive (#CC3333) |
| Card | KPIs, movimentações, tombos | border sutil, shadow-sm, rounded-lg |
| Badge | Status chips | amarelo, azul, verde, vermelho por status |
| Input | Formulários, busca | Ícones à esquerda |
| Combobox | Dropdown busca (unidades) | Busca local (~50 itens) |
| Dialog/Sheet | Modais, formulário SICAM | Sheet lateral desktop, fullscreen mobile |
| Toast (Sonner) | Feedback | 4 variantes |
| DataTable | Backlog, patrimônios | Ordenação, filtros, paginação |
| Skeleton | Loading | Shimmer animation |
| Avatar | Usuário no header/sidebar | Iniciais, fundo azul |

### 5.4 Grid e Espaçamento

- Base: múltiplos de 4px
- Padding página: 16px (mobile), 24px (tablet), 32px (desktop)
- Gap cards: 16px (mobile), 24px (desktop)
- Sidebar: 240px expandida, 64px colapsada
- Bottom nav: 64px + safe-area
- Header: 56px (mobile), 64px (desktop)
- Max-width conteúdo: 1280px

---

## 6. Acessibilidade (WCAG 2.1 AA)

- Navegação por teclado: Tab/Shift+Tab, Enter/Space, Escape, Arrow keys
- aria-labels em todos os ícones interativos
- aria-live="polite" em toasts e feedback
- Focus trap em modais e sheets
- Focus visible: outline 2px azul
- Área mínima de toque: 44x44px
- Contraste: texto #333 sobre branco = 12.6:1 (AAA)
- Scanner: alternativa via input manual sempre disponível

---

## 7. Notas de Implementação

### 7.1 Renderização

- **Server Components (default):** listagens, páginas de dados, layouts
- **Client Components:** scanner, formulários, bottom sheet, dropdowns, gráficos, notificações, toasts
- **Streaming/Suspense:** boundaries independentes para seções do dashboard

### 7.2 Performance

- Lazy loading do scanner (dynamic import)
- Virtualização para listas > 100 itens (react-virtual)
- Debounce 300ms em campos de busca
- Paginação server-side (20-50 itens)
- Prefetch de rotas frequentes (home → nova movimentação)

### 7.3 Ícones (lucide-react)

Scanner: Camera/Scan | Movimentação: ArrowRightLeft | Notificações: Bell | Backlog: ClipboardList | Dashboard: BarChart3 | CSV: Upload | Busca: Search | Confirmação: Check | Remover: X | Unidades: Building2 | Responsáveis: Users | Editar: Pencil | Teclado: Keyboard | Filtros: SlidersHorizontal
