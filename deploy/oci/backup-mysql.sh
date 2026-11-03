#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ENV_FILE=deploy/oci/.env
PASSPHRASE_FILE=/root/.config/nurfood/backup-passphrase
[[ -r "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
[[ -r "$PASSPHRASE_FILE" ]] || { echo "Missing protected backup passphrase file: $PASSPHRASE_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a
umask 077
mkdir -p deploy/oci/backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="deploy/oci/backups/.${stamp}.sql.gz"
out="deploy/oci/backups/nurfood-mysql-${stamp}.sql.gz.enc"
trap 'rm -f "$tmp"' EXIT

docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T db sh -c '
  cfg=$(mktemp)
  chmod 600 "$cfg"
  printf "[client]\nuser=%s\npassword=%s\nhost=127.0.0.1\n" "$MYSQL_USER" "$MYSQL_PASSWORD" > "$cfg"
  mysqldump --defaults-extra-file="$cfg" --single-transaction --routines --triggers --hex-blob "$MYSQL_DATABASE"
  rc=$?
  rm -f "$cfg"
  exit "$rc"
' | gzip -9 > "$tmp"

gzip -t "$tmp"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$tmp" -out "$out" -pass "file:$PASSPHRASE_FILE"
openssl enc -d -aes-256-cbc -pbkdf2 -in "$out" -pass "file:$PASSPHRASE_FILE" | gzip -t
sha256sum "$out" > "$out.sha256"
chmod 600 "$out" "$out.sha256"
find deploy/oci/backups -type f -name 'nurfood-mysql-*.sql.gz.enc*' -mtime +14 -delete
echo "Verified encrypted backup created: $out"
