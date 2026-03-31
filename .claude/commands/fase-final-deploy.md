# Fase Final — Testes Integrados, Hardening & Deploy

Todas as 3 ondas estão completas. Agora vamos garantir qualidade e preparar para produção. Consulte @CLAUDE.md.

## Tarefas

### F.1 — Teste de Carga e Performance
- Verifique que a importação CSV processa ~12.000 registros em menos de 60 segundos
- Verifique que listagens com paginação (backlog, patrimônios, auditoria) respondem em menos de 500ms
- Adicione índices ao Prisma schema se necessário (verifique os que já existem em .claude/rules/prisma.md)
- Para listas de patrimônios (até 12.000 tombos), confirme que virtualização (react-virtual) está ativa se a lista passa de 100 itens
- Rode `npx prisma migrate dev` se houver alterações no schema

### F.2 — Compatibilidade Mobile
- Verifique que o Scanner funciona com getUserMedia no Chrome Android e Safari iOS
- Verifique que o bottom navigation respeita safe-area-inset-bottom em iPhones
- Verifique que todos os alvos de toque têm mínimo 44x44px
- Verifique que o teclado virtual não cobre campos de input no mobile
- Teste a responsividade em 3 breakpoints: <768px, 768-1024px, >1024px

### F.3 — Autenticação LDAP Real
- Conecte o provider LDAP real da JFAP (usando variáveis .env de produção)
- Teste login com credenciais reais de pelo menos 1 usuário de cada perfil
- Verifique que o mapeamento de matrícula → perfil funciona corretamente
- Verifique que o fallback para dev local continua funcionando quando LDAP_URL não está configurado

### F.4 — E-mail SMTP Real
- Configure as variáveis SMTP com credenciais reais da JFAP
- Envie e-mail de teste para verificar entrega
- Verifique que os templates HTML renderizam corretamente em clientes de e-mail comuns (Outlook, Gmail)
- Verifique que o link de confirmação funciona com a URL real (APP_URL)
- Confirme que o remetente (SMTP_FROM) não é marcado como spam

### F.5 — Importação do CSV Real
- Importe o CSV real completo do SICAM (~12.000 tombos)
- Verifique que todos os registros foram importados/atualizados corretamente
- Verifique que caracteres especiais (acentos, ç) foram preservados
- Valide os dados: unidades, setores, responsáveis criados a partir do CSV

### F.6 — Hardening de Segurança
- Configure headers de segurança no next.config.ts:
  - Content-Security-Policy (CSP)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: strict-origin-when-cross-origin
- Adicione rate limiting nas rotas sensíveis:
  - POST /api/auth (login): máximo 10 tentativas por IP em 15 minutos
  - POST /confirmar/[token] (confirmação): máximo 5 por token em 5 minutos
- Valide tokens de confirmação: verifique expiração, uso único, formato UUID
- Verifique que todas as Server Actions validam perfil de acesso
- Verifique que a página pública (/confirmar/[token]) não expõe dados sensíveis

### F.7 — Backup Automatizado
- Crie script `scripts/backup.sh` que executa pg_dump do banco PostgreSQL, comprime com gzip, salva com timestamp
- Configure retenção: manter últimos 30 dias, apagar mais antigos
- Documente como restaurar um backup
- Adicione instrução para configurar cron job na VPS: `0 2 * * * /path/to/backup.sh`

### F.8 — Deploy em Produção
- Atualize docker-compose.yml para produção:
  - Remova portas expostas do PostgreSQL (só acesso interno entre containers)
  - Configure restart: unless-stopped em ambos os containers
  - Configure volume persistente para o banco
- Crie `docker-compose.prod.yml` (override) se necessário com configs específicas de produção
- Configure as variáveis .env de produção na VPS
- Build e deploy: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
- Configure Nginx ou Caddy como reverse proxy com HTTPS (certificado institucional)
- Verifique que a aplicação está acessível via HTTPS na URL final

### F.9 — Smoke Test em Produção
Execute os seguintes testes manuais no ambiente real:
- [ ] Login com credencial LDAP real → redirecionamento correto por perfil
- [ ] Importação do CSV real do SICAM → dados corretos
- [ ] Nova movimentação com input manual (scanner requer dispositivo real) → e-mail enviado
- [ ] Acesso ao link de confirmação via e-mail → confirmação funciona
- [ ] Backlog SEMAP exibe movimentação → registro no SICAM funciona
- [ ] Dashboard exibe KPIs com dados reais
- [ ] Notificações aparecem no sino
- [ ] CRUD admin: criar/editar unidade funciona
- [ ] Aplicação responsiva no celular (Chrome/Safari)

## Checklist Final de Deploy
- [ ] Docker Compose rodando na VPS (app + db)
- [ ] HTTPS com certificado válido
- [ ] LDAP/AD testado com credenciais reais
- [ ] SMTP testado e e-mails entregues
- [ ] CSV real importado com sucesso
- [ ] Scanner testado em dispositivo móvel real
- [ ] Backup automatizado configurado e restauração testada
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] Variáveis .env de produção configuradas
- [ ] Perfis de acesso dos usuários iniciais configurados
- [ ] Smoke test completo ✓
