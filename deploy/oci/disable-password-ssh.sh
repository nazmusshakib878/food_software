#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$EUID" -ne 0 || "${KEY_LOGIN_VERIFIED:-}" != YES ]]; then
  echo "After verifying a second SSH session with the private key, run with KEY_LOGIN_VERIFIED=YES." >&2
  exit 2
fi
DEPLOY_USER="${1:-ubuntu}"
[[ -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]] || { echo "No authorized key for $DEPLOY_USER" >&2; exit 1; }
cat >/etc/ssh/sshd_config.d/60-nur-food-pos.conf <<'EOF'
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh
echo "SSH password authentication disabled. Keep this verified key session open until reconnecting once more."
