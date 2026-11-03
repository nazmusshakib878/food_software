#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo." >&2; exit 2; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[[ -r "$ROOT/deploy/oci/.env" ]] || { echo "Missing deploy/oci/.env" >&2; exit 1; }
[[ -r /root/.config/nurfood/backup-passphrase ]] || { echo "Create the protected backup passphrase file first." >&2; exit 1; }

current="$(mktemp)"
next="$(mktemp)"
trap 'rm -f "$current" "$next"' EXIT
crontab -l 2>/dev/null | grep -Ev '# nur-food-pos-(backup|cert-renew)$' > "$current" || true
cat "$current" > "$next"
printf '15 2 * * * /bin/bash %s/deploy/oci/backup-mysql.sh >> /var/log/nur-food-pos-backup.log 2>&1 # nur-food-pos-backup\n' "$ROOT" >> "$next"
printf '30 3 * * * /bin/bash %s/deploy/oci/renew-cert.sh >> /var/log/nur-food-pos-cert-renew.log 2>&1 # nur-food-pos-cert-renew\n' "$ROOT" >> "$next"
crontab "$next"

cat >/etc/logrotate.d/nur-food-pos <<'EOF'
/var/log/nur-food-pos-backup.log /var/log/nur-food-pos-cert-renew.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    create 0600 root root
}
EOF
echo "Daily encrypted database backup and TLS renewal jobs installed in root's crontab."
