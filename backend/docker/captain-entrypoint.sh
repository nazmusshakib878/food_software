#!/bin/sh
set -eu

php artisan config:cache
php artisan view:cache

exec apache2-foreground
