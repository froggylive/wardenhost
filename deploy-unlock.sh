#!/usr/bin/env bash
# Run on the VPS hosting wardenhost.net to restore normal access.
set -euo pipefail
DIR="${WARDEN_DIR:-/root}"

cd "$DIR"
rm -f "${LICENSE_REVOKE_FILE:-/root/.warden_license_revoked}"
sed -i 's/^LICENSE_KEY=.*/LICENSE_KEY="WARDENHOST-LICENSE-ACTIVE"/' .env || true
npm run build
pm2 restart all 2>/dev/null || true
sleep 2

if curl -s https://www.wardenhost.net/ | grep -q "Installation not activated"; then
  echo "STILL LOCKED — check the revocation file and .env on this VPS."
else
  echo "UNLOCKED: https://www.wardenhost.net/ is serving normally."
fi
