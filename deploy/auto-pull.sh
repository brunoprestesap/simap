#!/usr/bin/env bash
# Pull-based auto-deploy: verifica a cada 5 min se ha nova imagem no GHCR e re-deploya.
# Acionado via cron: */5 * * * * /opt/simap/deploy/auto-pull.sh
# Nao requer acesso inbound — so faz pull do GHCR (outbound).
set -euo pipefail

STACK_DIR="/opt/simap"
COMPOSE_FILE="deploy/docker-compose.prod.yml"
IMAGE="ghcr.io/brunoprestesap/simap:latest"
LOG="/opt/simap/deploy/autodeploy.log"
LOCK="/tmp/simap-deploy.lock"

export GHCR_IMAGE="brunoprestesap/simap"

# Impede execucoes concorrentes (ex: deploy demorado + proximo tick do cron)
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$STACK_DIR"

# Sincroniza arquivos de deploy (nginx.conf, compose, scripts) com o repo
NGINX_BEFORE=$(md5sum deploy/nginx.conf 2>/dev/null || echo none)
git pull --ff-only origin main >> "$LOG" 2>&1 || {
  echo "$(date -Iseconds) AVISO: git pull falhou, continuando com versao local." >> "$LOG"
}
NGINX_AFTER=$(md5sum deploy/nginx.conf 2>/dev/null || echo none)

# Recarrega nginx sem downtime se o config mudou
if [ "$NGINX_BEFORE" != "$NGINX_AFTER" ]; then
  echo "$(date -Iseconds) nginx.conf atualizado, recarregando..." >> "$LOG"
  if docker exec simap-proxy nginx -t >> "$LOG" 2>&1; then
    docker exec simap-proxy nginx -s reload >> "$LOG" 2>&1
    echo "$(date -Iseconds) nginx recarregado." >> "$LOG"
  else
    echo "$(date -Iseconds) ERRO: nginx.conf invalido, reload cancelado." >> "$LOG"
  fi
fi

# Pull silencioso — falha silenciosa se GHCR estiver fora do ar
if ! docker pull "$IMAGE" --quiet > /dev/null 2>&1; then
  echo "$(date -Iseconds) AVISO: falha ao fazer pull de $IMAGE, tentativa adiada." >> "$LOG"
  exit 0
fi

# Compara digest da imagem recém-puxada com a que está rodando
LOCAL=$(docker inspect --format='{{.Id}}' "$IMAGE" 2>/dev/null || echo none)
RUNNING=$(docker inspect --format='{{.Image}}' simap-app 2>/dev/null || echo none)

# Nenhuma mudança: sai silenciosamente
[ "$LOCAL" = "$RUNNING" ] && exit 0

echo "$(date -Iseconds) Nova imagem detectada. Iniciando deploy..." >> "$LOG"

# Migracoes antes de trocar o container — aborta se falhar
if ! docker compose -f "$COMPOSE_FILE" run --rm --no-deps --entrypoint "" app \
  node /app/node_modules/prisma/build/index.js migrate deploy >> "$LOG" 2>&1; then
  echo "$(date -Iseconds) ERRO: migracoes falharam, deploy abortado." >> "$LOG"
  exit 1
fi

# Sobe a nova versao do app sem afetar os outros servicos
if ! docker compose -f "$COMPOSE_FILE" up -d --no-deps app >> "$LOG" 2>&1; then
  echo "$(date -Iseconds) ERRO: falha ao subir container, verifique logs do app." >> "$LOG"
  exit 1
fi

# Remove imagens antigas para evitar disco cheio (problema que ja ocorreu)
docker image prune -f >> "$LOG" 2>&1

echo "$(date -Iseconds) Deploy concluido com sucesso." >> "$LOG"
