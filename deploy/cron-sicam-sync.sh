#!/bin/bash
# Sync automático diário SICAM → SIMAP
# Chamado pelo cron do VPS às 2h: 0 2 * * * /opt/simap/deploy/cron-sicam-sync.sh
#
# Carrega CRON_SECRET do .env de produção e chama o endpoint HTTP.
# O endpoint decide entre sync DIFERENCIAL (se houve CONCLUIDA nos últimos 7 dias)
# ou COMPLETA (primeira vez, ou gap > 7 dias por falhas consecutivas).

set -euo pipefail

LOG_DIR="/opt/simap/logs"
LOG_FILE="${LOG_DIR}/cron-sicam.log"
APP_URL="${APP_URL:-https://simap.ap.trf1.gov.br}"
ENV_FILE="${ENV_FILE:-/opt/simap/.env}"

mkdir -p "$LOG_DIR"

# Carrega variáveis do .env sem exportar para o ambiente global do shell
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "[$(date -Iseconds)] ERRO: CRON_SECRET não definido em $ENV_FILE" >> "$LOG_FILE"
  exit 1
fi

echo "[$(date -Iseconds)] Iniciando sync SICAM automático..." >> "$LOG_FILE"

HTTP_STATUS=$(curl -sk \
  --write-out "%{http_code}" \
  --output /tmp/simap-cron-response.json \
  -X POST "${APP_URL}/api/cron/sicam-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 600 \
  2>> "$LOG_FILE") || HTTP_STATUS="000"

RESPONSE=$(cat /tmp/simap-cron-response.json 2>/dev/null || echo "{}")

echo "[$(date -Iseconds)] HTTP=$HTTP_STATUS resposta=$RESPONSE" >> "$LOG_FILE"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "[$(date -Iseconds)] FALHA: sync retornou HTTP $HTTP_STATUS" >> "$LOG_FILE"
  exit 1
fi

echo "[$(date -Iseconds)] Sync concluído com sucesso." >> "$LOG_FILE"
