#!/usr/bin/env bash
set -Eeuo pipefail

readonly EXPECTED_TUNNEL_PATTERN='^tunnel_[a-f0-9]{32}$'
readonly DEFAULT_SOURCE_REF='main'
readonly INSTALL_ROOT='/home/umbrel/umbrel/app-data/invio-mcp'
readonly SOURCE_DIR="${INSTALL_ROOT}/source"
readonly SECRETS_DIR="${INSTALL_ROOT}/secrets"
readonly STATE_DIR="${INSTALL_ROOT}/state"

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

if [[ "${EUID}" -ne 0 ]]; then
  die "Run this installer with sudo."
fi

for command in curl docker openssl tar; do
  require_command "${command}"
done
docker compose version >/dev/null 2>&1 || die "The Docker Compose plugin is required."
[[ -f /home/umbrel/umbrel/app-data/invio/docker-compose.yml ]] || die "Invio is not installed at the expected Umbrel path."
[[ -x /opt/umbreld/source/modules/apps/legacy-compat/app-script ]] || die "Umbrel's legacy app script was not found."

tunnel_id="${1:-}"
source_ref="${2:-${DEFAULT_SOURCE_REF}}"
[[ "${tunnel_id}" =~ ${EXPECTED_TUNNEL_PATTERN} ]] || die "Pass a valid tunnel_id as the first argument."
[[ "${source_ref}" =~ ^[A-Za-z0-9._-]{1,80}$ ]] || die "Invalid source ref."

umask 077
mkdir -p "${INSTALL_ROOT}" "${SECRETS_DIR}" "${STATE_DIR}"
chmod 700 "${INSTALL_ROOT}" "${SECRETS_DIR}" "${STATE_DIR}"

if [[ ! -s "${SECRETS_DIR}/control-plane-api-key" ]]; then
  printf 'OpenAI Runtime API Key (input hidden): ' >/dev/tty
  IFS= read -r -s runtime_key </dev/tty
  printf '\n' >/dev/tty
  [[ "${runtime_key}" == sk-* ]] || die "The runtime key must start with sk-."
  printf '%s\n' "${runtime_key}" > "${SECRETS_DIR}/control-plane-api-key"
  unset runtime_key
fi

if [[ ! -s "${SECRETS_DIR}/mcp-shared-secret" ]]; then
  openssl rand -hex 32 > "${SECRETS_DIR}/mcp-shared-secret"
fi
chmod 600 "${SECRETS_DIR}/control-plane-api-key" "${SECRETS_DIR}/mcp-shared-secret"

temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

archive_url="https://github.com/DEV-ITSD/Invio/archive/${source_ref}.tar.gz"
echo "Downloading the Invio MCP source from ${source_ref}..."
curl --fail --location --silent --show-error "${archive_url}" -o "${temporary_directory}/source.tar.gz"
mkdir -p "${temporary_directory}/archive"
tar -xzf "${temporary_directory}/source.tar.gz" -C "${temporary_directory}/archive"
archive_root="$(find "${temporary_directory}/archive" -mindepth 1 -maxdepth 1 -type d -print -quit)"
[[ -d "${archive_root}/umbrel-mcp" ]] || die "The downloaded source does not contain umbrel-mcp."

if [[ -d "${SOURCE_DIR}" ]]; then
  mv "${SOURCE_DIR}" "${INSTALL_ROOT}/source.backup-$(date -u +%Y%m%dT%H%M%SZ)"
fi
mkdir -p "${SOURCE_DIR}"
cp -a "${archive_root}/umbrel-mcp/." "${SOURCE_DIR}/"

cat > "${SOURCE_DIR}/.env" <<EOF
TUNNEL_ID=${tunnel_id}
MCP_IMAGE_TAG=latest
EOF
chmod 600 "${SOURCE_DIR}/.env"

cd "${SOURCE_DIR}"
echo "Building the MCP image on Umbrel. This can take several minutes the first time..."
docker compose --env-file .env -f compose.yml build --pull
docker compose --env-file .env -f compose.yml up -d

echo "Waiting for the MCP service and OpenAI tunnel..."
deadline=$((SECONDS + 180))
while (( SECONDS < deadline )); do
  mcp_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' invio_mcp_bridge_1 2>/dev/null || true)"
  tunnel_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' invio_mcp_tunnel_1 2>/dev/null || true)"
  if [[ "${mcp_health}" == "healthy" && "${tunnel_health}" == "healthy" ]]; then
    echo "Invio MCP and Secure MCP Tunnel are healthy."
    docker compose --env-file .env -f compose.yml ps
    exit 0
  fi
  sleep 5
done

docker compose --env-file .env -f compose.yml ps >&2 || true
docker compose --env-file .env -f compose.yml logs --tail 80 tunnel >&2 || true
die "The services did not become healthy within 180 seconds."
