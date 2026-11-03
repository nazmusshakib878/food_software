#!/usr/bin/env bash
set -Eeuo pipefail

SSH_ALLOWED_CIDR="${1:-}"
DEPLOY_USER="${2:-ubuntu}"
if [[ "$EUID" -ne 0 || -z "$SSH_ALLOWED_CIDR" ]]; then
  echo "Usage: sudo $0 <trusted-ssh-ip-or-cidr> [deploy-user]" >&2
  exit 2
fi
if [[ "$(. /etc/os-release && echo "$VERSION_ID")" != "24.04" || "$(uname -m)" != "aarch64" ]]; then
  echo "This setup is restricted to Ubuntu 24.04 ARM64." >&2
  exit 1
fi
python3 - "$SSH_ALLOWED_CIDR" <<'PY'
import ipaddress, sys
try:
    ipaddress.ip_network(sys.argv[1], strict=False)
except ValueError as exc:
    raise SystemExit(f"Invalid trusted SSH CIDR: {exc}")
PY

[[ -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]] || {
  echo "No authorized SSH public key found for $DEPLOY_USER; refusing firewall and SSH changes." >&2
  exit 1
}

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 ufw fail2ban unattended-upgrades ca-certificates curl openssl
systemctl enable --now docker fail2ban unattended-upgrades
usermod -aG docker "$DEPLOY_USER"

install -d -m 0755 /etc/docker
cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {"max-size": "10m", "max-file": "5"}
}
JSON
systemctl restart docker

cat >/etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl restart fail2ban
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

ufw default deny incoming
ufw default allow outgoing
ufw allow from "$SSH_ALLOWED_CIDR" to any port 22 proto tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "Server baseline applied. Verify a second SSH login using the key before running disable-password-ssh.sh."
echo "OCI VCN ingress must separately allow TCP 22 only from $SSH_ALLOWED_CIDR, plus TCP 80 and 443 from the internet. Do not open 3306/33060."
