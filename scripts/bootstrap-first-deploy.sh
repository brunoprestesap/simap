#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Uso:
  scripts/bootstrap-first-deploy.sh \
    --vps-host <host> \
    --vps-user <user> \
    --vps-path <path> \
    --ssh-key <arquivo_chave_privada> \
    --ghcr-user <usuario_ghcr> \
    --ghcr-token <token_ghcr> \
    --env-file <arquivo_env_producao> \
    --tls-cert-file <arquivo_certificado_pem> \
    --tls-key-file <arquivo_chave_pem> \
    [--vps-port <porta_ssh>] \
    [--repo <owner/repo>] \
    [--run-workflow]

Descricao:
  Automatiza o setup para o primeiro deploy:
  1) valida requisitos locais
  2) grava GitHub Secrets do repositorio
  3) prepara diretorio base da VPS
  4) opcionalmente dispara workflow CI/CD
EOF
}

need_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Comando obrigatorio ausente: ${cmd}" >&2
    exit 1
  fi
}

VPS_PORT="22"
RUN_WORKFLOW="false"
REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vps-host) VPS_HOST="$2"; shift 2 ;;
    --vps-user) VPS_USER="$2"; shift 2 ;;
    --vps-path) VPS_PATH="$2"; shift 2 ;;
    --ssh-key) SSH_KEY_PATH="$2"; shift 2 ;;
    --ghcr-user) GHCR_USER="$2"; shift 2 ;;
    --ghcr-token) GHCR_TOKEN="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --tls-cert-file) TLS_CERT_FILE="$2"; shift 2 ;;
    --tls-key-file) TLS_KEY_FILE="$2"; shift 2 ;;
    --vps-port) VPS_PORT="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --run-workflow) RUN_WORKFLOW="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opcao invalida: $1" >&2; usage; exit 1 ;;
  esac
done

: "${VPS_HOST:?Informe --vps-host}"
: "${VPS_USER:?Informe --vps-user}"
: "${VPS_PATH:?Informe --vps-path}"
: "${SSH_KEY_PATH:?Informe --ssh-key}"
: "${GHCR_USER:?Informe --ghcr-user}"
: "${GHCR_TOKEN:?Informe --ghcr-token}"
: "${ENV_FILE:?Informe --env-file}"
: "${TLS_CERT_FILE:?Informe --tls-cert-file}"
: "${TLS_KEY_FILE:?Informe --tls-key-file}"

if [[ ! -f "${SSH_KEY_PATH}" ]]; then
  echo "Chave SSH nao encontrada: ${SSH_KEY_PATH}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo .env de producao nao encontrado: ${ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${TLS_CERT_FILE}" ]]; then
  echo "Arquivo de certificado TLS nao encontrado: ${TLS_CERT_FILE}" >&2
  exit 1
fi

if [[ ! -f "${TLS_KEY_FILE}" ]]; then
  echo "Arquivo de chave TLS nao encontrado: ${TLS_KEY_FILE}" >&2
  exit 1
fi

need_cmd gh
need_cmd ssh
need_cmd scp

echo "Validando autenticacao GitHub CLI..."
gh auth status >/dev/null

if [[ -z "${REPO}" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
fi

echo "Configurando secrets no repositorio ${REPO}..."
gh secret set VPS_HOST --repo "${REPO}" --body "${VPS_HOST}"
gh secret set VPS_PORT --repo "${REPO}" --body "${VPS_PORT}"
gh secret set VPS_USER --repo "${REPO}" --body "${VPS_USER}"
gh secret set VPS_PATH --repo "${REPO}" --body "${VPS_PATH}"
gh secret set VPS_SSH_KEY --repo "${REPO}" < "${SSH_KEY_PATH}"
gh secret set GHCR_USER --repo "${REPO}" --body "${GHCR_USER}"
gh secret set GHCR_TOKEN --repo "${REPO}" --body "${GHCR_TOKEN}"
gh secret set APP_ENV_FILE --repo "${REPO}" < "${ENV_FILE}"
gh secret set TLS_CERT_PEM --repo "${REPO}" < "${TLS_CERT_FILE}"
gh secret set TLS_KEY_PEM --repo "${REPO}" < "${TLS_KEY_FILE}"

echo "Preparando VPS para primeiro deploy..."
ssh -i "${SSH_KEY_PATH}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" "mkdir -p '${VPS_PATH}/deploy'"
scp -i "${SSH_KEY_PATH}" -P "${VPS_PORT}" \
  "deploy/prepare-vps.sh" \
  "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/deploy/prepare-vps.sh"

ssh -i "${SSH_KEY_PATH}" -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" \
  "cd '${VPS_PATH}' && chmod +x deploy/prepare-vps.sh && VPS_PATH='${VPS_PATH}' bash deploy/prepare-vps.sh"

if [[ "${RUN_WORKFLOW}" == "true" ]]; then
  echo "Disparando workflow CI/CD VPS..."
  gh workflow run "CI/CD VPS" --repo "${REPO}"
  echo "Workflow disparado. Acompanhe com: gh run list --workflow \"CI/CD VPS\" --repo ${REPO}"
else
  echo "Bootstrap concluido. Para iniciar o primeiro deploy:"
  echo "  gh workflow run \"CI/CD VPS\" --repo ${REPO}"
fi
