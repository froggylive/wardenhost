#!/usr/bin/env bash
# WardenHost Management Suite — one-line installer
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/froggylive/wardenhost/main/installer.sh)
set -euo pipefail

REPO="https://github.com/froggylive/wardenhost.git"
BRANCH="main"
INSTALL_DIR="${WARDEN_DIR:-/root/wardenhost}"

has() { command -v "$1" >/dev/null 2>&1; }
root_check() { [[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash <(curl ...)"; exit 1; }; }

banner() {
  clear 2>/dev/null || true
  cat <<'EOF'
=================================================================
                 ⚡ WardenHost Management Suite
        Full Support: Debian 11/12/13 & Ubuntu 20/22/24
              Installer by FroggyLive
=================================================================
EOF
}

logo() {
  cat <<'EOF'
██╗    ██╗ █████╗ ██████╗ ████████╗██╗  ██╗██╗   ██╗███████╗
██║    ██║██╔══██╗██╔══██╗╚══██╔══╝██║  ██║╚██╗ ██╔╝██╔════╝
██║ █╗ ██║███████║██████╔╝   ██║   ███████║ ╚████╔╝ ███████╗
██║███╗██║██╔══██║██╔══██╗   ██║   ██╔══██║  ╚██╔╝  ╚════██║
╚███╔███╔╝██║  ██║██║  ██║   ██║   ██║  ██║   ██║   ███████║
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
        H O S T I N G   P L A T F O R M   I N S T A L L E R
EOF
}

menu() {
  banner
  logo
  cat <<'EOF'

  [1] 🚀 Install (Full automated install for Debian/Ubuntu)
  [2] 👤 Create/Reset Admin (Set admin email & password)
  [3] 🔄 Update (Pull updates, rebuild & reload)
  [4] ⚙️  Service Management (PM2 restart, logs, boot startup)
  [5] 🤖  Auto-fix (diagnose & repair common install errors)
  [6] 🗑️  Uninstall (Safe uninstall wizard)
  [0] 🚪 Exit

=================================================================
EOF
  read -r -p "Enter choice [0-6]: " choice
  case "$choice" in
    1) install_full ;;
    2) manage_admin ;;
    3) update_app ;;
    4) service_menu ;;
    5) auto_fix ;;
    6) uninstall_wizard ;;
    0|*) echo "Goodbye."; exit 0 ;;
  esac
  echo
  read -r -p "Press Enter to return to menu..." _
  menu
}

ensure_repo() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "Repository found at $INSTALL_DIR"
    return
  fi
  root_check
  echo "Cloning WardenHost repository..."
  git clone "$REPO" "$INSTALL_DIR"
  echo "Cloned to $INSTALL_DIR"
}

ensure_node() {
  if has node && [[ "$(node -v | cut -d. -f1 | tr -dc '0-9')" -ge 20 ]]; then
    echo "Node OK: $(node -v)"
    return
  fi
  root_check
  echo "Installing Node.js 22..."
  if has apt-get; then apt-get update -qq && apt-get install -y -qq curl xz-utils git >/dev/null; fi
  curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz -o /tmp/node.tar.xz
  mkdir -p /opt/node && tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1
  echo 'export PATH=/opt/node/bin:$PATH' > /etc/profile.d/wardenhost-node.sh
  export PATH=/opt/node/bin:$PATH
  echo "Node installed: $(node -v)"
}

configure_env() {
  cd "$INSTALL_DIR"
  local domain admin panel api
  read -r -p "Primary domain [localhost]: " domain; domain=${domain:-localhost}
  read -r -p "Admin email [admin@wardenhost.example]: " admin; admin=${admin:-admin@wardenhost.example}
  read -r -p "License panel password [FroggyLive]: " panel; panel=${panel:-FroggyLive}
  read -r -p "License API token [warden-license-api-2026]: " api; api=${api:-warden-license-api-2026}
  cat > .env <<EOF
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://${domain}:3001"
SESSION_SECRET="$(openssl rand -hex 32 2>/dev/null || echo change-me)"
LICENSE_KEY="WARDENHOST-LICENSE-ACTIVE"
ALLOWED_DOMAINS="${domain},localhost,127.0.0.1"
LICENSE_PANEL_PASSWORD="${panel}"
LICENSE_PANEL_URL="http://localhost:3006"
LICENSE_API_TOKEN="${api}"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
FAMPAY_API_KEY=""
FAMPAY_UPI_ID=""
FAMPAY_MERCHANT_NAME="WardenHost"
PANEL_API_URL=""
PANEL_API_KEY=""
SMTP_HOST="smtp.zoho.in"
SMTP_PORT="465"
SMTP_USER="support@wardenhost.net"
SMTP_PASSWORD=""
SMTP_FROM="WardenHost <support@wardenhost.net>"
SEED_ADMIN_EMAIL="${admin}"
SEED_ADMIN_PASSWORD="Admin@12345"
SEED_DEMO_EMAIL="demo@example.com"
SEED_DEMO_PASSWORD="Demo@12345"
EOF
}

setup_pm2() {
  root_check
  if ! has pm2; then npm install -g pm2 --no-audit --no-fund >/dev/null; fi
  cat > "$INSTALL_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: "wardenhost-website",
      cwd: "$INSTALL_DIR",
      script: "npm",
      args: "start",
      env: { PATH: "/opt/node/bin:/usr/local/bin:/usr/bin:/bin" }
    },
  ]
};
EOF
  cd "$INSTALL_DIR"
  pm2 delete all >/dev/null 2>&1 || true
  pm2 start ecosystem.config.js
  pm2 save
  echo "PM2 services started. Website: :3001  License panel: :3006"
}

install_full() {
  root_check
  ensure_repo
  ensure_node
  configure_env
  echo "Installing dependencies..."
  (cd "$INSTALL_DIR" && npm install --no-audit --no-fund)
  echo "Preparing database..."
  (cd "$INSTALL_DIR" && npx prisma db push && npm run db:seed)
  echo "Building..."
  (cd "$INSTALL_DIR" && npm run build)
  setup_pm2
  echo "✅ Installation complete."
}

manage_admin() {
  ensure_repo
  cd "$INSTALL_DIR"
  local email pass
  read -r -p "Admin email: " email
  read -r -s -p "New password: " pass; echo
  npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
p.user.upsert({
  where: { email: '$email' },
  update: { role: 'ADMIN', passwordHash: bcrypt.hashSync('$pass', 10), emailVerified: true },
  create: { name: 'Site Administrator', email: '$email', role: 'ADMIN', passwordHash: bcrypt.hashSync('$pass', 10), emailVerified: true },
}).then(() => { console.log('Admin saved'); return p.\$disconnect(); });
"
}

update_app() {
  ensure_repo
  cd "$INSTALL_DIR"
  git pull origin "$BRANCH"
  npm install --no-audit --no-fund
  npx prisma generate
  npm run build
  pm2 restart all || setup_pm2
  echo "✅ Update complete."
}

service_menu() {
  cat <<'EOF'
=================================================================
  [1] Restart all services
  [2] View logs
  [3] Enable boot startup
  [4] Stop all services
  [5] Back
=================================================================
EOF
  read -r -p "Enter choice [1-5]: " s
  case "$s" in
    1) pm2 restart all ;;
    2) pm2 logs --lines 40 ;;
    3) pm2 startup systemd -u root --hp /root | tail -1 | bash; pm2 save ;;
    4) pm2 stop all ;;
    5) return ;;
  esac
}

auto_fix() {
  root_check
  ensure_repo
  cd "$INSTALL_DIR"
  echo "🤖 Running diagnostics..."
  ensure_node
  has git || { apt-get update -qq && apt-get install -y -qq git >/dev/null; }

  echo "- repairing dependencies..."
  npm install --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund --force
  echo "- regenerating Prisma client & database..."
  npx prisma generate >/dev/null 2>&1 || true
  npx prisma db push --skip-generate >/dev/null 2>&1 || npx prisma db push
  echo "- verifying build..."
  if ! npm run build >/tmp/warden-autofix-build.log 2>&1; then
    echo "Build failed. Clearing .next and retrying once..."
    rm -rf .next
    npm run build || { echo "Build still failing. Last lines:"; tail -30 /tmp/warden-autofix-build.log; return 1; }
  fi
  echo "- checking ports..."
  for port in 3001 3006; do
    if fuser -n tcp "$port" >/dev/null 2>&1; then echo "Port $port in use; restarting PM2 services"; pm2 restart all >/dev/null 2>&1 || true; break; fi
  done
  pm2 restart all >/dev/null 2>&1 || setup_pm2
  echo "✅ Auto-fix complete. Website should be on :3001, license panel on :3006."
}

uninstall_wizard() {
  root_check
  echo "This stops services and removes PM2 entries. Source files remain."
  read -r -p "Continue? [y/N]: " ans
  [[ "$ans" =~ ^[Yy]$ ]] || return
  pm2 delete all >/dev/null 2>&1 || true
  pm2 save >/dev/null 2>&1 || true
  echo "Services removed. Files kept at $INSTALL_DIR"
}

menu
