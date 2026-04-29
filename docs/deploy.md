# Deploy em VPS (CI/CD)

Este projeto usa GitHub Actions para build/publicação da imagem Docker no GHCR e deploy remoto via SSH na VPS institucional com HTTPS via Nginx e certificado interno.

## Fluxo

1. Push em `main` dispara o workflow `CI/CD VPS`.
2. O pipeline roda `lint`, `test` e `build`.
3. A imagem é publicada em `ghcr.io/<org-ou-usuario>/<repo>` com tags:
   - `latest`
   - `sha-curto-do-commit`
4. O job de deploy conecta por SSH, atualiza arquivos em `deploy/`, grava `.env` na VPS e executa `deploy/deploy.sh`.
5. O script faz pull da imagem, sobe banco/app/proxy e executa `prisma migrate deploy`.

## Pré-requisitos na VPS

- Docker e Docker Compose plugin instalados.
- Usuário SSH com permissão para executar Docker.
- Diretório base do projeto (ex.: `/opt/simap`) acessível pelo usuário de deploy.
- Portas `80/tcp` e `443/tcp` liberadas no firewall.
- Certificado e chave PEM assinados pela CA interna para o dominio `APP_DOMAIN`.

## Estrutura usada em produção

- `deploy/docker-compose.prod.yml`: stack de produção (`app` + `db` + `proxy`).
- `deploy/nginx.conf.template`: template do virtual host HTTPS.
- `deploy/deploy.sh`: script idempotente de atualização.
- `.env` (na VPS): variáveis de runtime da aplicação e banco.
- `deploy/certs/server.crt` e `deploy/certs/server.key`: certificados usados pelo proxy.

## GitHub Variables e Secrets

### Variables (Repository Variables — não sigilosos)

- `VPS_HOST`: IP/FQDN da VPS.
- `VPS_PORT`: porta SSH (geralmente `22`).
- `VPS_USER`: usuário de deploy.
- `VPS_PATH`: caminho remoto onde os arquivos de deploy ficarão.

### Secrets (Repository Secrets — sigilosos)

- `VPS_SSH_KEY`: chave privada SSH (formato PEM/OpenSSH).
- `VPS_SSH_PASSPHRASE`: passphrase da chave SSH (string vazia se a chave não tiver).
- `APP_ENV_FILE`: conteúdo completo do `.env` de produção em formato multilinha.
- `TLS_CERT_PEM`: certificado TLS (PEM) emitido pela CA interna para `APP_DOMAIN`.
- `TLS_KEY_PEM`: chave privada do certificado TLS (PEM).

### GHCR (não precisa de secret manual)

O workflow autentica no GitHub Container Registry usando `${{ github.actor }}` e `${{ github.token }}` automaticamente — não há necessidade de gravar `GHCR_USER`/`GHCR_TOKEN` como secret.

## Exemplo de `.env` para produção

Use como base `.env.example`, ajustando para host interno `db` na URL do Prisma:

```env
POSTGRES_USER="simap"
POSTGRES_PASSWORD="trocar-por-segredo-forte"
POSTGRES_DB="simap"
DATABASE_URL="postgresql://simap:trocar-por-segredo-forte@db:5432/simap?schema=public"
APP_PORT="3000"
APP_URL="https://simap.ap.trf1.gov.br"
NEXTAUTH_URL="https://simap.ap.trf1.gov.br"
NEXTAUTH_URL_INTERNAL="http://app:3000"
AUTH_TRUST_HOST="true"
NEXTAUTH_SECRET="valor-seguro"
APP_DOMAIN="simap.ap.trf1.gov.br"
BACKUP_RETENTION_DAYS="14"
BACKUP_INTERVAL_SECONDS="86400"
```

## Observação importante sobre câmera

Em navegadores modernos, acesso à câmera (`getUserMedia`) exige **HTTPS** (ou `localhost`).
Com o proxy TLS e CA interna confiada no dispositivo, o scanner funciona em ambiente institucional.

## Primeiro provisionamento (manual)

1. Criar o diretório remoto definido em `VPS_PATH`.
2. Garantir que o usuário SSH consiga executar `docker ps` sem sudo (ou ajustar script).
3. Configurar os secrets no repositório GitHub.
4. Executar o workflow manualmente (`workflow_dispatch`) para validar o ciclo completo.

## Primeiro deploy automatizado (recomendado)

Com o script de bootstrap, voce prepara secrets do GitHub, valida a VPS e pode disparar o primeiro deploy no mesmo comando.

### 1) Crie um arquivo de ambiente de producao local

Exemplo: `.env.production` (nao commitar).

### 2) Execute o bootstrap

```bash
npm run deploy:bootstrap:first -- \
  --vps-host "seu-host-ou-ip" \
  --vps-user "usuario-ssh" \
  --vps-path "/opt/simap" \
  --ssh-key "$HOME/.ssh/id_rsa" \
  --ssh-passphrase "passphrase-da-chave-ou-vazio" \
  --env-file ".env.production" \
  --tls-cert-file "/caminho/simap.ap.trf1.gov.br.crt" \
  --tls-key-file "/caminho/simap.ap.trf1.gov.br.key" \
  --run-workflow
```

O script:

- valida `gh`, `ssh` e autenticacao no GitHub CLI;
- grava `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PATH` como **GitHub Variables**;
- grava `VPS_SSH_KEY`, `VPS_SSH_PASSPHRASE`, `APP_ENV_FILE`, `TLS_CERT_PEM`, `TLS_KEY_PEM` como **GitHub Secrets**;
- sobe e executa `deploy/prepare-vps.sh` na VPS;
- dispara o workflow `CI/CD VPS` (quando `--run-workflow` for informado).

### 3) Acompanhe a execucao

```bash
gh run list --workflow "CI/CD VPS"
gh run watch
```

## Rollback

Se uma versão falhar:

1. Descobrir a tag anterior estável no GHCR.
2. Conectar na VPS e executar:

```bash
cd "$VPS_PATH"
export IMAGE_TAG="<tag-anterior>"
export GHCR_IMAGE="<org-ou-usuario>/<repo>"
export GHCR_USER="<usuario-ghcr>"
export GHCR_TOKEN="<token-ghcr>"
bash deploy/deploy.sh
```

## Checklist pós-deploy

- `docker compose -f deploy/docker-compose.prod.yml ps` com `app`, `db`, `proxy` e `db-backup` em estado saudável.
- Aplicação acessível na URL institucional.
- Login e rota principal respondendo normalmente.
- `curl -k https://${APP_DOMAIN}/api/health` retorna `{"ok":true,"db":"up"}`.
- Logs sem erro crítico:
  - `docker compose -f deploy/docker-compose.prod.yml logs app --tail 100`
- Primeiro dump aparece em `deploy/backups/` em até 24h:
  - `ls -lh deploy/backups/`

## Backup e restore

### Backup automático

O serviço `db-backup` executa `pg_dump | gzip` periodicamente em `deploy/backups/simap_<TIMESTAMP>.sql.gz`. Cadência e retenção controladas por `BACKUP_INTERVAL_SECONDS` e `BACKUP_RETENTION_DAYS` no `.env`.

Para forçar um backup imediato:

```bash
cd "$VPS_PATH"
docker compose -f deploy/docker-compose.prod.yml exec db-backup \
  sh -c 'pg_dump --no-owner --no-privileges | gzip > /backups/simap_manual_$(date +%Y%m%d_%H%M%S).sql.gz'
```

### Restore (validar periodicamente em ambiente de teste)

```bash
cd "$VPS_PATH"
gunzip -c deploy/backups/simap_<TIMESTAMP>.sql.gz | \
  docker compose -f deploy/docker-compose.prod.yml exec -T db \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

> Recomenda-se testar restore em staging a cada 90 dias para validar integridade dos dumps.

## Renovação do certificado TLS interno

Os certificados ficam em `deploy/certs/server.crt` e `deploy/certs/server.key` na VPS. A CA institucional emite com validade típica de 1-2 anos.

### Verificar data de expiração

```bash
cd "$VPS_PATH"
openssl x509 -in deploy/certs/server.crt -noout -enddate
# Saída esperada: notAfter=<data>
```

### Renovar (rolagem sem downtime do app)

1. Solicitar novo cert e chave para `APP_DOMAIN` à CA interna.
2. Atualizar os GitHub Secrets `TLS_CERT_PEM` e `TLS_KEY_PEM` (o próximo deploy os recria na VPS).
3. **OU** substituir manualmente na VPS sem aguardar deploy:

```bash
cd "$VPS_PATH"
cp deploy/certs/server.crt deploy/certs/server.crt.bak
cp deploy/certs/server.key deploy/certs/server.key.bak

# Substituir pelos novos arquivos (copiar via scp, etc.)

chmod 644 deploy/certs/server.crt
chmod 600 deploy/certs/server.key

# Reload do nginx sem derrubar conexões ativas
docker compose -f deploy/docker-compose.prod.yml exec proxy nginx -t
docker compose -f deploy/docker-compose.prod.yml exec proxy nginx -s reload
```

4. Validar:

```bash
echo | openssl s_client -servername "${APP_DOMAIN}" -connect "${APP_DOMAIN}":443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Lembrete operacional

Recomenda-se cadastrar lembrete (calendário institucional ou monitoração) **30 dias antes** da expiração para iniciar o processo de renovação com folga.
