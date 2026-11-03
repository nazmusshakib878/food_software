#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ENV_FILE=deploy/oci/.env
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml run --rm certbot renew --quiet
docker compose --env-file "$ENV_FILE" -f docker-compose.oci.yml exec -T nginx nginx -s reload
