const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

const INPUT_PATH = path.join(process.cwd(), 'faaltarin-ads.json');
const OUTPUT_JSON = path.join(process.cwd(), 'faaltarin-details.json');
const OUTPUT_XLSX = path.join(process.cwd(), 'faaltarin-details.xlsx');

// حالت production: به‌صورت ENV قابل تغییر، پیش‌فرض 6 برای سرور
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const HEADLESS = process.env.HEADLESS !== undefined ? (process.env.HEADLESS === 'false' ? false : 'new') : 'new';
const LAUNCH_ARGS = (process.env.PUPPETEER_ARGS || '--no-sandbox --disable-setuid-sandbox')
  .split(' ')
  .filter(Boolean);
const WAIT_OPTIONS = { waitUntil: 'domcontentloaded' };

const blockedTypes = new Set(['image', 'media', 'font', 'stylesheet']);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function setupPage(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (blockedTypes.has(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

function normalize(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function parseShopId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('id') || '';
  } catch {
    return '';
  }
}

async function extractDetails(page, base) {
  const data = await page.evaluate(() => {
    const contactBox = Array.from(document.querySelectorAll('div.box')).find((b) =>
      b.innerText.includes('اطلاعات تماس'),
    );
    const result = {
      province: '',
      city: '',
      website: '',
      address: '',
      phone: [],
      mobile: [],
      fax: [],
      email: [],
    };
    if (!contactBox) return result;
    const lines = contactBox.innerText
      .split('\n')
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const getLine = (prefix) => {
      const hit = lines.find((l) => l.startsWith(prefix));
      return hit ? hit.replace(prefix, '').trim() : '';
    };
    result.province = getLine('استان:');
    result.city = getLine('شهر:');
    const collectAfterStrong = (label) => {
      const strong = Array.from(contactBox.querySelectorAll('strong')).find((s) =>
        s.textContent.trim().startsWith(label),
      );
      if (!strong) return [];
      const vals = [];
      let node = strong.nextSibling;
      while (node && !(node.nodeType === 1 && node.tagName === 'STRONG')) {
        if (node.nodeType === 3) {
          const txt = node.textContent.replace(/\s+/g, ' ').trim();
          if (txt) vals.push(txt);
        } else if (node.nodeType === 1) {
          const txt = node.textContent.replace(/\s+/g, ' ').trim();
          if (txt) vals.push(txt);
        }
        node = node.nextSibling;
      }
      return vals;
    };
    const websiteNodes = collectAfterStrong('وب سایت');
    const websiteHref = (() => {
      const strong = Array.from(contactBox.querySelectorAll('strong')).find((s) =>
        s.textContent.trim().startsWith('وب سایت'),
      );
      if (!strong) return '';
      let node = strong.nextSibling;
      while (node && !(node.nodeType === 1 && node.tagName === 'STRONG')) {
        if (node.nodeType === 1) {
          const a = node.querySelector && node.querySelector('a');
          if (a && a.href) return a.href;
        }
        node = node.nextSibling;
      }
      return '';
    })();
    let website = [websiteHref, ...websiteNodes].filter(Boolean).join(' ');
    if (website.includes('faaltarin.com')) {
      website = '';
    }
    result.website = website;
    result.address = collectAfterStrong('نشانی').join(' ');
    result.phone = collectAfterStrong('تلفن');
    result.mobile = collectAfterStrong('همراه');
    result.fax = collectAfterStrong('نمابر');
    result.email = collectAfterStrong('ایمیل');
    return result;
  });
  return {
    ...base,
    shopId: parseShopId(base.shopUrl),
    province: normalize(data.province),
    city: normalize(data.city),
    website: normalize(data.website),
    address: normalize(data.address),
    phone: data.phone.map(normalize),
    mobile: data.mobile.map(normalize),
    fax: data.fax.map(normalize),
    email: data.email.map(normalize),
  };
}

async function withPool(items, limit, worker) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input not found: ${INPUT_PATH}`);
  }
  const ads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : ads.length;
  const slice = ads.slice(0, limit);
  console.log(`Processing ${slice.length} shops with concurrency ${CONCURRENCY}`);
  const browser = await puppeteer.launch({ headless: HEADLESS, args: LAUNCH_ARGS });
  const results = await withPool(slice, CONCURRENCY, async (item, index) => {
    try {
      await delay(100); // برای پایداری سرور
      const page = await browser.newPage();
      await setupPage(page);
      await page.goto(item.shopUrl, WAIT_OPTIONS);
      const details = await extractDetails(page, item);
      if ((index + 1) % 200 === 0 || index === 0) {
        console.log(`  ✓ ${index + 1}/${slice.length} ${item.shopUrl}`);
      }
      await page.close();
      return details;
    } catch (err) {
      console.error(`  ✗ ${index + 1}/${slice.length} ${item.shopUrl} -> ${err.message}`);
      return { ...item, error: err.message };
    }
  });
  await browser.close();
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Saved JSON: ${OUTPUT_JSON}`);
  const mongoUri = process.env.MONGO_URI;
  const mongoDbName = process.env.MONGO_DB || 'faaltarin';
  const mongoColl = process.env.MONGO_COLLECTION || 'shops';
  if (mongoUri) {
    console.log(`Writing to MongoDB ${mongoDbName}.${mongoColl}`);
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection(mongoColl);
    const bulkOps = results.map((r) => ({
      updateOne: {
        filter: { shopId: r.shopId || null },
        update: { $set: r },
        upsert: true,
      },
    }));
    const chunkSize = 1000;
    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize);
      await collection.bulkWrite(chunk, { ordered: false });
      console.log(`  Mongo inserted/updated ${Math.min(i + chunkSize, bulkOps.length)}/${bulkOps.length}`);
    }
    await client.close();
  }
  const flat = results.map((r) => ({
    shopId: r.shopId,
    title: r.title,
    manager: r.manager,
    categoryUrl: r.categoryUrl,
    page: r.page,
    shopUrl: r.shopUrl,
    province: r.province,
    city: r.city,
    website: r.website,
    address: r.address,
    phone: (r.phone || []).join(' | '),
    mobile: (r.mobile || []).join(' | '),
    fax: (r.fax || []).join(' | '),
    email: (r.email || []).join(' | '),
    rawText: r.rawText,
    error: r.error || '',
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(flat);
  XLSX.utils.book_append_sheet(workbook, sheet, 'shops');
  XLSX.writeFile(workbook, OUTPUT_XLSX);
  console.log(`Saved XLSX: ${OUTPUT_XLSX}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
