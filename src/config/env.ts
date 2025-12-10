import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/scraper',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  proxyList: process.env.PROXY_LIST || '',
  concurrencyGoogle: parseInt(process.env.CONCURRENCY_GOOGLE || '2', 10),
  concurrencyWebsite: parseInt(process.env.CONCURRENCY_WEBSITE || '10', 10),
  concurrencyInstagram: parseInt(process.env.CONCURRENCY_INSTAGRAM || '4', 10),
  puppeteerRestartThreshold: parseInt(process.env.PUPPETEER_RESTART_THRESHOLD || '50', 10),
  userAgentList: process.env.USER_AGENT_LIST,
  logLevel: process.env.LOG_LEVEL || 'info'
};

