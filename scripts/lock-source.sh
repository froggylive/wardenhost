#!/usr/bin/env bash
# Lock application source/config files against edits (including accidental AI edits).
# Admin panel continues to manage content in the database.
set -euo pipefail
ROOT="${WARDEN_DIR:-/root}"
MARKER="$ROOT/.warden_source_locked"

echo "Locking source files in $ROOT ..."

# Directories containing source/assets that must never change at runtime.
for dir in app components lib deploy public/images public/fonts scripts; do
  if [[ -d "$ROOT/$dir" ]]; then
    find "$ROOT/$dir" -type f -print0 | while IFS= read -r -d '' f; do
      chmod 444 "$f"
      chattr +i "$f" 2>/dev/null || true
    done
    find "$ROOT/$dir" -type d -exec chmod 755 {} \; 2>/dev/null || true
  fi
done

# Prisma source files (never the live database file).
for f in schema.prisma seed.ts catalog.ts run-catalog.ts; do
  if [[ -f "$ROOT/prisma/$f" ]]; then
    chmod 444 "$ROOT/prisma/$f"
    chattr +i "$ROOT/prisma/$f" 2>/dev/null || true
  fi
done

# Root config/docs/scripts.
for f in package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.mjs next.config.mjs middleware.ts ecosystem.config.js README.md SECURITY.md .env.example installer.sh install.sh deploy-lock.sh deploy-unlock.sh deploy-license-mode.sh deploy-license-client.sh; do
  if [[ -f "$ROOT/$f" ]]; then
    chmod 444 "$ROOT/$f"
    chattr +i "$ROOT/$f" 2>/dev/null || true
  fi
done

if [[ -f "$ROOT/.env" ]]; then
  chmod 400 "$ROOT/.env"
  chattr +i "$ROOT/.env" 2>/dev/null || true
fi

# Writable area for admin uploads only.
mkdir -p "$ROOT/public/uploads"
chmod 755 "$ROOT/public/uploads"

echo "locked at $(date -u)" > "$MARKER"
echo "✅ Source locked. Content is managed only through the admin panel."
echo "To make code changes, run: npm run secure:unlock"
