#!/usr/bin/env bash
# Run on the VPS hosting wardenhost.net to make license deletion effective.
set -euo pipefail
DIR="${WARDEN_DIR:-/root}"

cd "$DIR"
echo "Pulling latest code..."
git pull origin main
npm install --no-audit --no-fund
npm run build

echo "Disabling env master key..."
sed -i 's/^LICENSE_KEY=.*/LICENSE_KEY=""/' .env || true

echo "Writing revocation marker..."
echo "revoked by FroggyLive at $(date -u)" > "${LICENSE_REVOKE_FILE:-/root/.warden_license_revoked}"

pm2 restart all 2>/dev/null || true
sleep 2

if curl -s https://www.wardenhost.net/ | grep -q "Installation not activated"; then
  echo "LOCKED: https://www.wardenhost.net/ now shows the activation screen."
else
  echo "NOT LOCKED YET — check that nginx/tunnel points to this app and that PM2 restarted it."
fi
