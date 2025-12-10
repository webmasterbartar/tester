#!/usr/bin/env bash
set -euo pipefail

# Pull latest code, install deps, build, restart pm2 apps
echo "[deploy] pulling latest code"
git pull --ff-only

echo "[deploy] installing dependencies"
npm install

echo "[deploy] building project"
npm run build

echo "[deploy] restarting pm2 services"
npm run pm2:reload || true
pm2 reload ecosystem.config.js --only api,google-worker,website-worker,instagram-worker || pm2 start ecosystem.config.js

echo "[deploy] done"

