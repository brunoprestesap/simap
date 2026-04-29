#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="deploy/docker-compose.prod.yml"
APP_SERVICE="app"
DB_SERVICE="db"
PROXY_SERVICE="proxy"
BACKUP_SERVICE="db-backup"

require_env() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    echo "Variavel obrigatoria ausente: ${var_name}" >&2
    exit 1
  fi
}

require_env GHCR_USER
require_env GHCR_TOKEN
require_env GHCR_IMAGE
require_env APP_DOMAIN

IMAGE_TAG="${IMAGE_TAG:-latest}"
export GHCR_IMAGE IMAGE_TAG

if [[ ! -f ".env" ]]; then
  echo "Arquivo .env nao encontrado no diretorio atual: $(pwd)" >&2
  exit 1
fi

if [[ ! -f "deploy/nginx.conf.template" ]]; then
  echo "Arquivo de template do Nginx nao encontrado: deploy/nginx.conf.template" >&2
  exit 1
fi

if [[ ! -f "deploy/certs/server.crt" ]] || [[ ! -f "deploy/certs/server.key" ]]; then
  echo "Certificado/chave TLS ausentes em deploy/certs/." >&2
  echo "Esperado: deploy/certs/server.crt e deploy/certs/server.key" >&2
  exit 1
fi

echo "Gerando configuracao do Nginx para dominio ${APP_DOMAIN}..."
sed "s|\${APP_DOMAIN}|${APP_DOMAIN}|g" deploy/nginx.conf.template > deploy/nginx.conf

echo "Autenticando no GHCR..."
echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

echo "Atualizando imagem da aplicacao..."
docker compose -f "${COMPOSE_FILE}" pull "${APP_SERVICE}"

echo "Subindo banco de dados..."
docker compose -f "${COMPOSE_FILE}" up -d "${DB_SERVICE}"

echo "Aplicando migracoes Prisma..."
docker compose -f "${COMPOSE_FILE}" run --rm --entrypoint "" "${APP_SERVICE}" \
  node /app/node_modules/prisma/build/index.js migrate deploy

echo "Subindo aplicacao..."
docker compose -f "${COMPOSE_FILE}" up -d "${APP_SERVICE}"

echo "Subindo proxy HTTPS..."
docker compose -f "${COMPOSE_FILE}" up -d "${PROXY_SERVICE}"

echo "Subindo servico de backup do banco..."
mkdir -p deploy/backups
docker compose -f "${COMPOSE_FILE}" up -d "${BACKUP_SERVICE}"

echo "Validando status dos containers..."
docker compose -f "${COMPOSE_FILE}" ps

if ! docker compose -f "${COMPOSE_FILE}" ps "${APP_SERVICE}" --format json | rg -q "\"State\":\"running\""; then
  echo "Falha: servico ${APP_SERVICE} nao entrou em estado running." >&2
  echo "Rollback manual sugerido: export IMAGE_TAG=<tag_anterior> && bash deploy/deploy.sh" >&2
  exit 1
fi

if ! docker compose -f "${COMPOSE_FILE}" ps "${PROXY_SERVICE}" --format json | rg -q "\"State\":\"running\""; then
  echo "Falha: servico ${PROXY_SERVICE} nao entrou em estado running." >&2
  echo "Verifique certificado/chave em deploy/certs e dominio APP_DOMAIN." >&2
  exit 1
fi

echo "Deploy concluido com sucesso para tag ${IMAGE_TAG}."
