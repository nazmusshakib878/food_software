#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ENV_FILE=deploy/oci/.env
PASSPHRASE_FILE=/root/.config/nurfood/backup-passphrase
BACKUP_FILE="${1:-}"
[[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]] || { echo "Usage: $0 deploy/oci/backups/<backup>.sql.gz.enc" >&2; exit 2; }
[[ -r "$BACKUP_FILE.sha256" ]] || { echo "Backup checksum file is missing." >&2; exit 1; }
[[ -r "$PASSPHRASE_FILE" ]] || { echo "Missing protected backup passphrase file." >&2; exit 1; }
[[ -r "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a
: "${RESTORE_TARGET_DATABASE:?Set RESTORE_TARGET_DATABASE to a new, empty database name}"
if [[ "${RESTORE_CONFIRM_DATABASE:-}" != "$RESTORE_TARGET_DATABASE" || ! "$RESTORE_TARGET_DATABASE" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Refusing restore. Set RESTORE_CONFIRM_DATABASE to the exact new target database name." >&2
  exit 1
fi
(cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$BACKUP_FILE").sha256")
umask 077
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -in "$BACKUP_FILE" -pass "file:$PASSPHRASE_FILE" | gzip -dc > "$tmp"
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T db sh -c '
  set -e
  cfg=$(mktemp)
  chmod 600 "$cfg"
  printf "[client]\nuser=root\npassword=%s\nhost=127.0.0.1\n" "$MYSQL_ROOT_PASSWORD" > "$cfg"
  mysql --defaults-extra-file="$cfg" -e "CREATE DATABASE IF NOT EXISTS $1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  rc=$?
  rm -f "$cfg"
  exit "$rc"
' sh "$RESTORE_TARGET_DATABASE"
table_count="$(docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T db sh -c '
  set -e
  cfg=$(mktemp); chmod 600 "$cfg"
  printf "[client]\nuser=root\npassword=%s\nhost=127.0.0.1\n" "$MYSQL_ROOT_PASSWORD" > "$cfg"
  tables=$(mysql --defaults-extra-file="$cfg" -Nse "SHOW TABLES FROM $1")
  printf "%s\n" "$tables" | awk "NF {n++} END {print n+0}"
  rc=$?
  rm -f "$cfg"; exit "$rc"
' sh "$RESTORE_TARGET_DATABASE")"
if [[ "$table_count" != "0" ]]; then
  echo "Refusing restore: target database is not empty." >&2
  exit 1
fi
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T db sh -c '
  set -e
  cfg=$(mktemp); chmod 600 "$cfg"
  printf "[client]\nuser=root\npassword=%s\nhost=127.0.0.1\n" "$MYSQL_ROOT_PASSWORD" > "$cfg"
  mysql --defaults-extra-file="$cfg" "$1"; rc=$?
  rm -f "$cfg"; exit "$rc"
' sh "$RESTORE_TARGET_DATABASE" < "$tmp"
echo "Restore completed to empty database: $RESTORE_TARGET_DATABASE"
