# Scraping Platform (Node.js + TypeScript)

A production-oriented scraping system for high-volume Google/website/Instagram scraping using BullMQ queues, Redis, MongoDB, Puppeteer, and pm2. Designed for SSH + git deployment on a Linux VPS (no Docker).

## Features
- Modular services and workers (Google, website, Instagram) with BullMQ queues.
- Proxy rotation, random user-agents, and session recycling to reduce blocks.
- MongoDB storage for results; Redis for queues.
- pm2 ecosystem config for API + worker processes.
- Deployment scripts (`scripts/deploy.sh`, `scripts/start.sh`) for Git+SSH workflow.

## Quick Start (Local)
1. Install dependencies  
   `npm install`
2. Copy `.env.example` to `.env` and fill connection strings.
3. Run build  
   `npm run build`
4. Start API (dev)  
   `npm run dev`
5. Start workers (one terminal each in dev)  
   `ts-node src/workers/google.worker.ts`  
   `ts-node src/workers/website.worker.ts`  
   `ts-node src/workers/instagram.worker.ts`

## Environment Variables
See `src/config/env.ts` for defaults.
```
PORT=3000
MONGO_URL=mongodb://localhost:27017/scraper
REDIS_URL=redis://127.0.0.1:6379
PROXY_LIST=ip:port,ip:port
CONCURRENCY_GOOGLE=2
CONCURRENCY_WEBSITE=10
CONCURRENCY_INSTAGRAM=4
PUPPETEER_RESTART_THRESHOLD=50
USER_AGENT_LIST=comma,separated,agents (optional)
LOG_LEVEL=info
```

## API
- `POST /api/scrape` body: `{ "keyword": "مبل فروشی" }`
  - Enqueues Google scraping for the keyword.

## Deployment (Ubuntu VPS, Git + SSH, pm2)
1. Push code to your git remote.
2. On the server, clone repo and set up `.env`.
3. Install Node.js 18+, Redis, MongoDB.
4. Run `scripts/deploy.sh` (pull, install, build, restart pm2).
5. pm2 apps defined in `ecosystem.config.js`:
   - `api` → `dist/index.js`
   - `google-worker` → `dist/workers/google.worker.js`
   - `website-worker` → `dist/workers/website.worker.js`
   - `instagram-worker` → `dist/workers/instagram.worker.js`

## Monitoring
- Logs written to `logs/` and stdout (pino).
- Use `pm2 logs` or `pm2 monit` on the server.

## Notes
- Google scraping uses direct result URLs (no typing) and Cheer.io parsing.
- Website scraper uses `fetch` only (no headless browser).
- Instagram scraper uses Puppeteer, rotating proxy/session when blocked.

