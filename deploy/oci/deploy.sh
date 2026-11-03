#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

ENV_FILE="deploy/oci/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy deploy/oci/env.example and fill its values securely." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

: "${APP_URL:?Set APP_URL to the public HTTPS API URL}"
: "${DB_DATABASE:?Set database name}"
: "${DB_USERNAME:?Set database user}"
: "${DB_PASSWORD:?Set database password}"
: "${MYSQL_ROOT_PASSWORD:?Set MySQL root password}"
: "${TLS_EMAIL:?Set TLS_EMAIL for certificate issuance}"
if [[ "$APP_URL" != https://* || "$APP_DEBUG" != false ]]; then
  echo "Refusing deployment: APP_URL must use HTTPS and APP_DEBUG must be false." >&2
  exit 1
fi
API_HOST="${APP_URL#https://}"
if [[ "$API_HOST" == */* || "$API_HOST" == *:* ]]; then
  echo "APP_URL must contain only the HTTPS hostname without a path or port." >&2
  exit 1
fi
if [[ -z "${APP_KEY:-}" ]]; then
  APP_KEY="base64:$(openssl rand -base64 32 | tr -d '\n')"
  sed -i "s|^APP_KEY=.*|APP_KEY=$APP_KEY|" "$ENV_FILE"
  export APP_KEY
fi

mkdir -p deploy/oci/letsencrypt deploy/oci/certbot/www deploy/oci/backups
chmod 700 deploy/oci deploy/oci/letsencrypt deploy/oci/backups

docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml build app
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml up -d db app nginx

# Report migration state without changing the database. Applying migrations
# requires an explicit, backed-up database confirmation in a separate step.
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T app php artisan migrate:status

if [[ ! -s deploy/oci/letsencrypt/live/nur-food-pos/fullchain.pem ]]; then
  docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml run --rm certbot \
    certonly --webroot -w /var/www/certbot --cert-name nur-food-pos \
    -d "$API_HOST" -m "$TLS_EMAIL" --agree-tos --non-interactive
fi

docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T app php artisan config:cache
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T app php artisan view:cache
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml restart nginx
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml ps
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 3 "$APP_URL/up"
echo
echo "TLS is configured. Review migration status, verify a backup, then apply migrations only after confirming the target database."
