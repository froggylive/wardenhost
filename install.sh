#!/usr/bin/env bash
# WardenHost Linux installer — interactive menu (whiptail when available).
# Usage: sudo bash install.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LP_DIR="$ROOT_DIR/license-panel"
LOG_DIR="/var/log/wardenhost"
PID_DIR="/var/run/wardenhost"

has() { command -v "$1" >/dev/null 2>&1; }

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "Please run as root: sudo bash install.sh" >&2
    exit 1
  fi
}

install_node() {
  if has node && [[ "$(node -v | cut -d. -f1 | tr -dc '0-9')" -ge 20 ]]; then
    echo "Node already installed: $(node -v)"
    return
  fi
  echo "Installing Node.js 22..."
  if has apt-get; then apt-get update -qq && apt-get install -y -qq curl xz-utils >/dev/null; fi
  curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz -o /tmp/node.tar.xz
  mkdir -p /opt/node
  tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1
  echo 'export PATH=/opt/node/bin:$PATH' > /etc/profile.d/wardenhost-node.sh
  chmod +x /etc/profile.d/wardenhost-node.sh
  export PATH=/opt/node/bin:$PATH
  echo "Node installed: $(node -v)"
}

prompt() {
  local label="$1" default="${2:-}" var
  if has whiptail; then
    var=$(whiptail --inputbox "$label" 10 60 "$default" 3>&1 1>&2 2>&3) || var="$default"
  else
    read -r -p "$label [$default]: " var
    var="${var:-$default}"
  fi
  printf '%s' "$var"
}

configure_env() {
  echo "Configuring environment files..."
  local domain admin_email api_token
  domain=$(prompt "Primary domain (no https)" "localhost")
  admin_email=$(prompt "Admin email" "admin@wardenhost.example")
  # License validation uses the central panel only. No local license panel is installed.
  api_token="${LICENSE_API_TOKEN:-warden-license-api-2026}"

  cat > "$ROOT_DIR/.env" <<EOF
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://${domain}:3001"
SESSION_SECRET="$(openssl rand -hex 32 2>/dev/null || echo change-me)"
LICENSE_KEY=""
ALLOWED_DOMAINS="${domain},localhost,127.0.0.1"
LICENSE_PANEL_URL="https://licensekey.itsfroggy.com"
LICENSE_API_TOKEN="${api_token}"
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
SEED_ADMIN_EMAIL="${admin_email}"
SEED_ADMIN_PASSWORD="Admin@12345"
SEED_DEMO_EMAIL="demo@example.com"
SEED_DEMO_PASSWORD="Demo@12345"
EOF

  echo "Environment file written. Licenses are managed at https://licensekey.itsfroggy.com/"
}

install_app() {
  echo "Installing dependencies..."
  (cd "$ROOT_DIR" && npm install --no-audit --no-fund)
  (cd "$LP_DIR" && npm install --no-audit --no-fund)
  echo "Preparing database..."
  (cd "$ROOT_DIR" && npx prisma db push && npm run db:seed)
  echo "Building applications..."
  (cd "$ROOT_DIR" && npm run build)
  (cd "$LP_DIR" && npm run build)
  write_commands
  echo "Install complete."
}

write_commands() {
  mkdir -p "$LOG_DIR" "$PID_DIR"
  cat > /usr/local/bin/wardenhost-start <<'EOF'
#!/usr/bin/env bash
set -e
source /etc/profile.d/wardenhost-node.sh 2>/dev/null || true
mkdir -p /var/log/wardenhost /var/run/wardenhost
cd /root
nohup npm start > /var/log/wardenhost/website.log 2>&1 & echo $! > /var/run/wardenhost/website.pid
echo "Website: http://localhost:3001"
echo "Licenses: https://licensekey.itsfroggy.com/"
EOF
  cat > /usr/local/bin/wardenhost-stop <<'EOF'
#!/usr/bin/env bash
for f in /var/run/wardenhost/*.pid; do
  [[ -f "$f" ]] || continue
  kill "$(cat "$f")" 2>/dev/null || true
  rm -f "$f"
done
echo "WardenHost services stopped."
EOF
  chmod +x /usr/local/bin/wardenhost-start /usr/local/bin/wardenhost-stop
}

start_services() { ensure_root; write_commands; /usr/local/bin/wardenhost-start; }
stop_services() { ensure_root; /usr/local/bin/wardenhost-stop; }

install_systemd() {
  ensure_root
  cat > /etc/systemd/system/wardenhost-website.service <<EOF
[Unit]
Description=WardenHost Website
After=network.target
[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStart=$(command -v npm) start
Restart=always
Environment=PATH=/opt/node/bin:/usr/local/bin:/usr/bin:/bin
[Install]
WantedBy=multi-user.target
EOF
  cat > /etc/systemd/system/wardenhost-license.service <<EOF
[Unit]
Description=WardenHost License Panel
After=network.target
[Service]
Type=simple
WorkingDirectory=$LP_DIR
ExecStart=$(command -v npm) start
Restart=always
Environment=PATH=/opt/node/bin:/usr/local/bin:/usr/bin:/bin
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now wardenhost-website wardenhost-license
  echo "systemd services enabled."
}

main_menu() {
  local choice
  while true; do
    if has whiptail; then
      choice=$(whiptail --title "WardenHost Installer" --menu "Choose an option" 18 70 8 \
        "1" "Install / update (deps, DB, build, commands)" \
        "2" "Configure .env files" \
        "3" "Start website (port 3001)" \
        "4" "Stop services" \
        "5" "Enable systemd auto-start" \
        "6" "View website log" \
        "7" "View website log" \
        "8" "Exit" 3>&1 1>&2 2>&3) || exit 0
    else
      echo "==== WardenHost Installer ===="
      echo "1) Install / update"
      echo "2) Configure .env files"
      echo "3) Start services"
      echo "4) Stop services"
      echo "5) Enable systemd auto-start"
      echo "6) View website log"
      echo "7) View website log"
      echo "8) Exit"
      read -r -p "Choice: " choice
    fi
    case "$choice" in
      1) ensure_root; install_node; configure_env; install_app ;;
      2) configure_env ;;
      3) start_services ;;
      4) stop_services ;;
      5) install_systemd ;;
      6) tail -n 40 "$LOG_DIR/website.log" 2>/dev/null || echo "No log yet." ;;
      7) tail -n 40 "$LOG_DIR/website.log" 2>/dev/null || echo "No log yet." ;;
      8|*) exit 0 ;;
    esac
    has whiptail || read -r -p "Press Enter to continue..." _
  done
}

main_menu
