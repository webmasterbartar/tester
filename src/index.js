const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const LINKS_PATH = path.join(process.cwd(), 'faaltarin-links.json');
const OUTPUT_PATH = path.join(process.cwd(), 'faaltarin-ads.json');
const HEADLESS = 'new';
const LAUNCH_ARGS = (process.env.PUPPETEER_ARGS || '--no-sandbox --disable-setuid-sandbox')
  .split(' ')
  .filter(Boolean);
const WAIT_OPTIONS = { waitUntil: 'domcontentloaded' };

/** Sleep helper to be gentle with the site */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Extract ads from current page */
async function extractAds(page, categoryUrl, pageNumber) {
  return page.$$eval(
    'a.box[href*="shop/?id="]',
    (links, categoryUrl, pageNumber) =>
      links.map((a) => {
        const href = new URL(a.getAttribute('href'), location.href).href;
        const text = a.innerText.replace(/\s+/g, ' ').trim();
        const titleMatch = text.split(' مدیر');
        const title = titleMatch[0]?.trim() || text;
        const manager = (a.querySelector('span')?.innerText || '').replace(/\s+/g, ' ').trim();
        return {
          categoryUrl,
          page: pageNumber,
          shopUrl: href,
          title,
          manager,
          rawText: text,
        };
      }),
    categoryUrl,
    pageNumber,
  );
}

/** Find next page URL; returns null if no next */
async function getNextPage(page) {
  return page.$eval('.box.ltr.alignCenter', (pagination) => {
    const active = pagination.querySelector('.pagingActive');
    if (!active) return null;
    const next = active.nextElementSibling;
    if (!next || !next.classList.contains('paging')) return null;
    const href = next.getAttribute('href');
    return href ? new URL(href, location.href).href : null;
  }).catch(() => null);
}

async function scrapeCategory(browser, categoryUrl) {
  const page = await browser.newPage();
  const results = [];
  let currentUrl = categoryUrl;
  let pageNumber = 1;

  while (currentUrl) {
    await page.goto(currentUrl, WAIT_OPTIONS);
    await page.waitForSelector('body');

    const ads = await extractAds(page, categoryUrl, pageNumber);
    results.push(...ads);

    const nextUrl = await getNextPage(page);
    if (nextUrl && nextUrl !== currentUrl) {
      currentUrl = nextUrl;
      pageNumber += 1;
      await delay(500); // short pause between pages
    } else {
      break;
    }
  }

  await page.close();
  return results;
}

async function main() {
  if (!fs.existsSync(LINKS_PATH)) {
    throw new Error(`Links file not found at ${LINKS_PATH}`);
  }

  const links = JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8'));
  const browser = await puppeteer.launch({ headless: HEADLESS, args: LAUNCH_ARGS });
  const all = [];

  for (const [index, link] of links.entries()) {
    console.log(`Scraping ${index + 1}/${links.length}: ${link.href}`);
    try {
      const items = await scrapeCategory(browser, link.href);
      all.push(...items);
      console.log(`  ✓ collected ${items.length} ads`);
    } catch (err) {
      console.error(`  ✗ failed ${link.href}:`, err.message);
    }
    await delay(800); // pause between categories
  }

  await browser.close();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all, null, 2), 'utf8');
  console.log(`Done. Total ads: ${all.length}. Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exitCode = 1;
});
