#!/usr/bin/env bash
# Configure a WardenHost website install to use the central license panel only.
set -euo pipefail
DIR="${WARDEN_DIR:-/root}"
TOKEN="${LICENSE_API_TOKEN:-warden-license-api-2026}"
PANEL="${LICENSE_PANEL_URL:-https://licensekey.itsfroggy.com}"

cd "$DIR"
git pull origin main
npm install --no-audit --no-fund
npm run build

# No local license panel and no env master key on client servers.
sed -i 's/^LICENSE_KEY=.*/LICENSE_KEY=""/' .env || true
sed -i "s|^LICENSE_PANEL_URL=.*|LICENSE_PANEL_URL=\"${PANEL}\"|" .env || true
sed -i "s|^LICENSE_API_TOKEN=.*|LICENSE_API_TOKEN=\"${TOKEN}\"|" .env || true

pm2 restart all 2>/dev/null || true
sleep 2
echo "Configured: LICENSE_PANEL_URL=${PANEL}"
echo "Open the site and enter a license key created at ${PANEL}"
