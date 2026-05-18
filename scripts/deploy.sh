#!/usr/bin/env bash
# Deploy script for the production VPS at /opt/minizi.
#
# Why this exists: when a new column lands in the Prisma schema but the
# production DB hasn't yet been migrated, every authenticated request to
# /api/progress 500s and PM2 piles up restarts. The fix is procedural:
# always run `prisma migrate deploy` between `git pull` and `pm2 reload`.
#
# Usage on the server:
#     cd /opt/minizi && ./scripts/deploy.sh
#
# Or as a PM2 deploy hook:
#     pm2 deploy ecosystem.config.cjs production
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "→ deploy from $ROOT"

# 1. Pull the latest code from origin/main (or whatever branch is checked
#    out — production uses `main`).
echo "→ git pull"
git pull --ff-only

# 2. Install / update dependencies. Use `npm ci` if `package-lock.json`
#    has changed since the last install, otherwise `npm install` is fast
#    enough and tolerates dependency tree drift.
echo "→ npm install"
npm install --omit=dev=false --no-audit --no-fund

# 3. Apply any pending DB migrations. THIS MUST RUN BEFORE `next build`
#    because the build can import server modules that touch the schema.
echo "→ prisma migrate deploy"
npx prisma migrate deploy

# 4. Regenerate the Prisma client to match the current schema. The
#    postinstall hook usually handles this, but running it explicitly is
#    cheap and makes failures obvious.
echo "→ prisma generate"
npx prisma generate

# 5. Build the Next.js production bundle.
echo "→ next build"
npm run build

# 6. Reload the PM2 process (graceful — keeps connections alive until the
#    new instance is ready).
echo "→ pm2 reload minizi"
pm2 reload minizi --update-env

echo "✓ deploy complete"
