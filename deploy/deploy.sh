#!/usr/bin/env bash
#
# deploy.sh — Bibliotheca'yı yerel makineden uzak sunucuya scp ile gönderir.
#
# Kullanım:
#   REMOTE_USER=eren REMOTE_HOST=10.212.134.32 ./deploy/deploy.sh
#
# Ortam değişkenleri (varsayılanlar parantez içinde):
#   REMOTE_USER   Uzak sunucu kullanıcısı            (eren)
#   REMOTE_HOST   Uzak sunucu IP/hostname            (zorunlu)
#   REMOTE_DIR    Uzak hedef dizin                   (/opt/bibliotheca)
#   SSH_PORT      SSH portu                          (22)
#
# NOT: VPN tüneli (openfortivpn) açık ve sunucuya erişilebilir olmalı.

set -euo pipefail

REMOTE_USER="${REMOTE_USER:-eren}"
REMOTE_HOST="${REMOTE_HOST:?REMOTE_HOST tanımlı değil. Örn: REMOTE_HOST=10.212.134.32}"
REMOTE_DIR="${REMOTE_DIR:-/opt/bibliotheca}"
SSH_PORT="${SSH_PORT:-22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
SSH="ssh -p ${SSH_PORT} ${REMOTE_USER}@${REMOTE_HOST}"

echo "==> Hedef dizin oluşturuluyor: ${DEST}"
$SSH "sudo mkdir -p '${REMOTE_DIR}' && sudo chown -R \$(whoami) '${REMOTE_DIR}'"

echo "==> Dosyalar gönderiliyor (node_modules ve .env hariç)..."
# rsync varsa daha verimli; yoksa scp'ye düş.
if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.env' \
    -e "ssh -p ${SSH_PORT}" \
    "${SCRIPT_DIR}/" "${DEST}/"
else
  scp -P "${SSH_PORT}" -r \
    "${SCRIPT_DIR}/api.js" \
    "${SCRIPT_DIR}/db.js" \
    "${SCRIPT_DIR}/server.js" \
    "${SCRIPT_DIR}/index.html" \
    "${SCRIPT_DIR}/schema.sql" \
    "${SCRIPT_DIR}/package.json" \
    "${SCRIPT_DIR}/package-lock.json" \
    "${SCRIPT_DIR}/middleware" \
    "${SCRIPT_DIR}/routes" \
    "${SCRIPT_DIR}/db" \
    "${SCRIPT_DIR}/deploy" \
    "${DEST}/"
fi

echo "==> Sunucuda bağımlılıklar kuruluyor..."
$SSH "cd '${REMOTE_DIR}' && npm ci --omit=dev || npm install --omit=dev"

cat <<EOF

==> Dosyalar gönderildi: ${DEST}

Sırada (sunucuda bir kez yapılır):
  1) .env oluştur:   cp ${REMOTE_DIR}/.env.example ${REMOTE_DIR}/.env && nano ${REMOTE_DIR}/.env
  2) Şemayı yükle:   bkz. deploy/DEPLOY.md (sqlcmd ...)
  3) systemd servis: bkz. deploy/DEPLOY.md
EOF
