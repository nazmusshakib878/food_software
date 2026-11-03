#!/bin/sh
set -eu

port="${PORT:-10000}"
if [ "$port" != "10000" ]; then
    sed -i "s/:10000>/:${port}>/" /etc/apache2/sites-available/000-default.conf
    sed -i "s/^Listen 10000$/Listen ${port}/" /etc/apache2/ports.conf
fi

# Render generates APP_KEY as a base64-encoded 256-bit secret. Laravel expects
# the same value with its base64: marker so it decodes to the required 32 bytes.
if [ -n "${APP_KEY:-}" ] && [ "${APP_KEY#base64:}" = "$APP_KEY" ]; then
    decoded_length="$(printf '%s' "$APP_KEY" | base64 -d 2>/dev/null | wc -c | tr -d ' ')"
    if [ "$decoded_length" = "32" ]; then
        export APP_KEY="base64:${APP_KEY}"
    fi
fi

if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_HOSTNAME:-}" ]; then
    export APP_URL="https://${RENDER_EXTERNAL_HOSTNAME}"
fi

php artisan config:cache
exec apache2-foreground
