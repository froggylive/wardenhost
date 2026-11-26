#!/usr/bin/env bash
# Temporarily unlock source files for maintenance, then re-lock when finished.
set -euo pipefail
ROOT="${WARDEN_DIR:-/root}"
MARKER="$ROOT/.warden_source_locked"

echo "Unlocking source files in $ROOT ..."

for dir in app components lib deploy public/images public/fonts scripts; do
  if [[ -d "$ROOT/$dir" ]]; then
    find "$ROOT/$dir" -type f -print0 | while IFS= read -r -d '' f; do
      chattr -i "$f" 2>/dev/null || true
      chmod 644 "$f"
    done
  fi
done

for f in schema.prisma seed.ts catalog.ts run-catalog.ts; do
  [[ -f "$ROOT/prisma/$f" ]] && chattr -i "$ROOT/prisma/$f" 2>/dev/null || true
  [[ -f "$ROOT/prisma/$f" ]] && chmod 644 "$ROOT/prisma/$f" || true
done

for f in package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.mjs next.config.mjs middleware.ts ecosystem.config.js README.md SECURITY.md .env.example installer.sh install.sh deploy-lock.sh deploy-unlock.sh deploy-license-mode.sh deploy-license-client.sh .env; do
  [[ -f "$ROOT/$f" ]] && chattr -i "$ROOT/$f" 2>/dev/null || true
  [[ -f "$ROOT/$f" ]] && chmod 600 "$ROOT/$f" || true
done

rm -f "$MARKER"
echo "✅ Source unlocked. Re-lock with: npm run secure:lock"
