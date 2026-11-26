#!/usr/bin/env bash
# Enable real license enforcement on the VPS hosting wardenhost.net.
# The site will show the activation screen until a valid DB license is entered.
set -euo pipefail
DIR="${WARDEN_DIR:-/root}"

cd "$DIR"
git pull origin main
npm install --no-audit --no-fund
npm run build

# Remove the hard revocation marker and the env master bypass.
# From now on only database licenses with matching domains can unlock the site.
rm -f "${LICENSE_REVOKE_FILE:-/root/.warden_license_revoked}"
sed -i 's/^LICENSE_KEY=.*/LICENSE_KEY=""/' .env

pm2 restart all 2>/dev/null || true
sleep 2

echo "License mode enabled."
if curl -s https://www.wardenhost.net/ | grep -q "Installation not activated"; then
  echo "OK: activation screen is live. Create a license in the private license panel, then enter its key at https://www.wardenhost.net/"
else
  echo "Check proxy/PM2 — activation screen not detected."
fi
