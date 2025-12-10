import { Page } from 'puppeteer';
import { newPage } from '../config/puppeteer';
import { getRandomProxy } from '../config/proxies';
import { randomUserAgent } from '../utils/userAgents';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface InstagramScrapeResult {
  phone: string | null;
  bio: string | null;
  username: string | null;
}

const extractMetadata = async (page: Page) => {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"], script'));
    const meta: Record<string, unknown> = {};
    scripts.forEach((s) => {
      try {
        const json = JSON.parse(s.textContent || '{}');
        Object.assign(meta, json);
      } catch (err) {
        // ignore
      }
    });
    const bio = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;
    return { meta, bio };
  });
};

export class InstagramScraper {
  async scrape(usernameOrUrl: string, attempt = 0): Promise<InstagramScrapeResult> {
    const username = usernameOrUrl.includes('instagram.com')
      ? usernameOrUrl.split('instagram.com/')[1].split('/')[0]
      : usernameOrUrl.replace('@', '');

    const proxy = getRandomProxy();
    const page: Page = await newPage(proxy);
    const profileUrl = `https://www.instagram.com/${username}/`;

    try {
      await page.setUserAgent(randomUserAgent(env.userAgentList?.split(',')));
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      const { meta, bio } = await extractMetadata(page);
      const phone =
        (meta as any)?.telephone ||
        (meta as any)?.contact_point ||
        (bio && bio.match(/\+?\d[\d\s\-\(\)]{7,}\d/)?.[0]) ||
        null;

      return {
        phone: phone ? phone.toString() : null,
        bio,
        username
      };
    } catch (err) {
      if (attempt < 2) {
        logger.warn({ err, username, attempt }, 'Instagram retry with new session');
        try {
          await page.close();
        } catch {
          // ignore
        }
        return this.scrape(usernameOrUrl, attempt + 1);
      }
      logger.error({ err, username }, 'Instagram scrape failed');
      throw err;
    } finally {
      try {
        await page.close();
      } catch (err) {
        logger.warn({ err }, 'Failed closing page');
      }
    }
  }
}

