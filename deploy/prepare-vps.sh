#!/usr/bin/env bash
set -Eeuo pipefail

require_env() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    echo "Variavel obrigatoria ausente: ${var_name}" >&2
    exit 1
  fi
}

require_env VPS_PATH

echo "Preparando diretorio base em ${VPS_PATH}..."
mkdir -p "${VPS_PATH}/deploy"
mkdir -p "${VPS_PATH}/deploy/backups"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado na VPS." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Plugin docker compose nao encontrado na VPS." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Usuario atual nao consegue executar docker. Ajuste permissoes/grupo docker." >&2
  exit 1
fi

cd "${VPS_PATH}"
if [[ ! -f ".env" ]]; then
  echo "Aviso: .env ainda nao existe em ${VPS_PATH}. Ele sera criado pelo workflow de deploy."
fi

echo "VPS preparada para receber o primeiro deploy."
