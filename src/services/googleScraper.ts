import fetch, { RequestInit } from 'node-fetch';
import cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getRandomProxy } from '../config/proxies';
import { randomUserAgent } from '../utils/userAgents';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface GoogleResult {
  url: string;
  title: string | null;
}

export interface GoogleScrapeResult {
  results: GoogleResult[];
  instagramProfiles: string[];
  hasResults: boolean;
}

const isCaptchaPage = (html: string): boolean => {
  return html.includes('detected unusual traffic') || html.includes('/sorry/');
};

const buildSearchUrl = (keyword: string, page: number): string => {
  const start = page * 100;
  const params = new URLSearchParams({
    q: keyword,
    num: '100',
    hl: 'fa',
    start: start.toString()
  });
  return `https://www.google.com/search?${params.toString()}`;
};

export class GoogleScraper {
  async fetchPage(keyword: string, page: number, attempt = 0): Promise<string> {
    const proxy = getRandomProxy();
    const url = buildSearchUrl(keyword, page);
    const headers = {
      'User-Agent': randomUserAgent(env.userAgentList?.split(',')),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    const options: RequestInit = {
      headers
    };

    if (proxy) {
      options.agent = new HttpsProxyAgent(`http://${proxy}`);
    }

    try {
      const res = await fetch(url, options);
      const html = await res.text();
      if (isCaptchaPage(html)) {
        throw new Error('captcha_detected');
      }
      return html;
    } catch (err) {
      if (attempt < 3) {
        logger.warn({ err, keyword, page, attempt }, 'Google fetch retry');
        return this.fetchPage(keyword, page, attempt + 1);
      }
      logger.error({ err, keyword, page }, 'Google fetch failed');
      throw err;
    }
  }

  parse(html: string): GoogleScrapeResult {
    const $ = cheerio.load(html);
    const results: GoogleResult[] = [];
    const instagramProfiles: string[] = [];

    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/url?q=')) {
        const realUrl = decodeURIComponent(href.replace('/url?q=', '').split('&')[0]);
        const title = $(el).text() || null;
        results.push({ url: realUrl, title });
        if (realUrl.includes('instagram.com')) {
          const parts = realUrl.split('/');
          const username = parts[3];
          if (username) instagramProfiles.push(username);
        }
      }
    });

    return {
      results,
      instagramProfiles,
      hasResults: results.length > 0
    };
  }

  async scrape(keyword: string, page: number): Promise<GoogleScrapeResult> {
    const html = await this.fetchPage(keyword, page);
    return this.parse(html);
  }
}

