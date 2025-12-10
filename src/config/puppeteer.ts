import puppeteer, { Browser, Page } from 'puppeteer';
import { env } from './env';
import { getRandomProxy } from './proxies';
import { randomUserAgent } from '../utils/userAgents';
import { logger } from '../utils/logger';

let browser: Browser | null = null;
let currentProxy: string | null = null;
let jobCounter = 0;

const launchBrowser = async (proxy?: string | null): Promise<Browser> => {
  const args = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-setuid-sandbox'
  ];
  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
  }
  const instance = await puppeteer.launch({
    headless: true,
    args
  });
  currentProxy = proxy || null;
  jobCounter = 0;
  logger.info({ proxy }, 'Puppeteer launched');
  return instance;
};

const ensureBrowser = async (proxy?: string | null): Promise<Browser> => {
  const rotate = jobCounter >= env.puppeteerRestartThreshold;
  const proxyChanged = proxy && proxy !== currentProxy;

  if (!browser || rotate || proxyChanged) {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        logger.warn({ err }, 'Failed closing old browser');
      }
    }
    browser = await launchBrowser(proxy);
  }
  return browser;
};

export const newPage = async (forceProxy?: string | null): Promise<Page> => {
  const proxy = forceProxy ?? getRandomProxy();
  browser = await ensureBrowser(proxy || undefined);
  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent());
  jobCounter += 1;
  return page;
};

export const closeBrowser = async (): Promise<void> => {
  if (!browser) return;
  try {
    await browser.close();
  } catch (err) {
    logger.error({ err }, 'Error closing browser');
  } finally {
    browser = null;
  }
};

