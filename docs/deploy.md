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

## Deploy manual a partir da máquina do dev

Use este procedimento quando o `Deploy on VPS` do workflow CI/CD falhar (típico: o runner cloud do GitHub não tem rota para o IP privado da VPS interna). A máquina do dev, por estar dentro da rede TRF/JFAP, alcança a VPS por SSH.

### Pré-requisitos

- Chave SSH dedicada autorizada em `srvsimap-ap@<VPS>` (ver passo 1 do bootstrap).
- `.env.production` local atualizado (mesmo conteúdo do GitHub Secret `APP_ENV_FILE`).
- Certs em `~/certs/simap/` com chave + cert para `${APP_DOMAIN}`.
- Imagem nova já publicada no GHCR (jobs `Lint, Test and Build` e `Build and Push Image` do workflow ficaram verdes).

### 1) Sincronizar arquivos com a VPS

A partir da raiz do repo, no Git Bash:

```bash
VPS_USER=srvsimap-ap
VPS_HOST=172.18.10.158
VPS_PATH=/opt/simap
SSH_KEY=~/.ssh/id_ed25519_simap

# .env de produção
scp -i $SSH_KEY .env.production $VPS_USER@$VPS_HOST:$VPS_PATH/.env

# certs
scp -i $SSH_KEY ~/certs/simap/${APP_DOMAIN}.crt $VPS_USER@$VPS_HOST:$VPS_PATH/deploy/certs/server.crt
scp -i $SSH_KEY ~/certs/simap/${APP_DOMAIN}.key $VPS_USER@$VPS_HOST:$VPS_PATH/deploy/certs/server.key

# scripts e configs do deploy
scp -i $SSH_KEY \
  deploy/deploy.sh \
  deploy/docker-compose.prod.yml \
  deploy/nginx.conf.template \
  deploy/prepare-vps.sh \
  $VPS_USER@$VPS_HOST:$VPS_PATH/deploy/
```

### 2) Ajustar permissões e gerar nginx.conf na VPS

```bash
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST '
  chmod 600 /opt/simap/.env /opt/simap/deploy/certs/server.key
  chmod 644 /opt/simap/deploy/certs/server.crt
  chmod +x /opt/simap/deploy/deploy.sh /opt/simap/deploy/prepare-vps.sh

  cd /opt/simap
  set -a; . ./.env; set +a
  sed "s|\${APP_DOMAIN}|${APP_DOMAIN}|g" deploy/nginx.conf.template > deploy/nginx.conf
'
```

### 3) Pull da imagem e rodar migrations

> **Atenção**: o `deploy/deploy.sh` faz `docker login ghcr.io` antes do pull. Se o pacote no GHCR estiver **público**, pode pular o login. Se estiver **privado**, exporte `GHCR_USER` (seu user GitHub) e `GHCR_TOKEN` (PAT com `read:packages`) antes de rodar.

```bash
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST '
  cd /opt/simap
  set -a; . ./.env; set +a
  export GHCR_IMAGE="<owner>/<repo>"
  export IMAGE_TAG="latest"

  # Pull (público — não precisa login)
  docker pull "ghcr.io/${GHCR_IMAGE}:${IMAGE_TAG}"

  # Sobe DB e aguarda saudável
  COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
  $COMPOSE up -d db
  for i in 1 2 3 4 5 6 7 8 9 10; do
    $COMPOSE ps db --format json | grep -q "\"Health\":\"healthy\"" && break
    sleep 3
  done

  # Migrate (precisa do Dockerfile já com node_modules completo + prisma.config.ts)
  $COMPOSE run --rm --entrypoint "" app \
    node /app/node_modules/prisma/build/index.js migrate deploy
'
```

### 4) Subir app, proxy e backup

```bash
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST '
  cd /opt/simap
  set -a; . ./.env; set +a
  export GHCR_IMAGE="<owner>/<repo>"
  export IMAGE_TAG="latest"

  COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
  $COMPOSE up -d app
  $COMPOSE up -d proxy
  $COMPOSE up -d db-backup
  $COMPOSE ps
'
```

### 5) Validar

```bash
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST '
  echo "=== /api/health via app direto ==="
  docker exec simap-app wget -qO- http://127.0.0.1:3000/api/health
  echo
  echo "=== /api/health via proxy HTTPS ==="
  curl -ksS --resolve ${APP_DOMAIN}:443:127.0.0.1 https://${APP_DOMAIN}/api/health
'
```

Esperado: `{"ok":true,"service":"simap","db":"up"}` em ambos os casos.

> Veja a seção [Checklist pós-deploy](#checklist-pós-deploy) para validações adicionais.

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
