#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

need_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Comando obrigatorio ausente: ${cmd}" >&2
    exit 1
  fi
}

need_cmd git
need_cmd docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Plugin docker compose nao encontrado." >&2
  exit 1
fi

cd "${ROOT_DIR}"

if [[ ! -d ".git" ]]; then
  echo "Diretorio atual nao parece ser um clone git valido: ${ROOT_DIR}" >&2
  exit 1
fi

echo "Atualizando codigo da branch ${DEPLOY_BRANCH}..."
git fetch origin "${DEPLOY_BRANCH}"
git pull --ff-only origin "${DEPLOY_BRANCH}"

echo "Executando deploy local na VPS..."
bash deploy/deploy.sh
