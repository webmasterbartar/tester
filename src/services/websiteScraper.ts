import fetch, { RequestInit } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getRandomProxy } from '../config/proxies';
import { randomUserAgent } from '../utils/userAgents';
import { extractPhones, extractSchemaPhone, extractInstagramProfiles } from '../utils/parser';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface WebsiteScrapeResult {
  phone: string | null;
  instagram: string | null;
}

export class WebsiteScraper {
  async fetch(url: string, attempt = 0): Promise<string> {
    const proxy = getRandomProxy();
    const headers = {
      'User-Agent': randomUserAgent(env.userAgentList?.split(',')),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    const options: RequestInit = { headers };
    if (proxy) {
      options.agent = new HttpsProxyAgent(`http://${proxy}`);
    }
    try {
      const res = await fetch(url, options);
      return await res.text();
    } catch (err) {
      if (attempt < 2) {
        logger.warn({ err, url, attempt }, 'Website fetch retry');
        return this.fetch(url, attempt + 1);
      }
      logger.error({ err, url }, 'Website fetch failed');
      throw err;
    }
  }

  async scrape(url: string): Promise<WebsiteScrapeResult> {
    const html = await this.fetch(url);
    const phones = [...extractPhones(html), ...extractSchemaPhone(html)];
    const instagramProfiles = extractInstagramProfiles(html);
    return {
      phone: phones[0] || null,
      instagram: instagramProfiles[0] || null
    };
  }
}

