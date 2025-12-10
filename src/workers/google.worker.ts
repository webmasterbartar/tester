import { Worker, Job } from 'bullmq';
import { GOOGLE_QUEUE_NAME } from '../queues/googleQueue';
import { websiteQueue } from '../queues/websiteQueue';
import { instagramQueue } from '../queues/instagramQueue';
import { redisConnection } from '../config/redis';
import { GoogleScraper } from '../services/googleScraper';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { connectMongo } from '../config/db';

const scraper = new GoogleScraper();

const processor = async (job: Job) => {
  await connectMongo();
  const { keyword } = job.data as { keyword: string };
  let page = 0;
  let keepGoing = true;

  while (keepGoing) {
    const result = await scraper.scrape(keyword, page);
    logger.info({ keyword, page, total: result.results.length }, 'Google page scraped');

    for (const entry of result.results) {
      if (entry.url.includes('instagram.com')) {
        const username = entry.url.split('instagram.com/')[1]?.split('/')[0];
        if (username) {
          await instagramQueue.add(
            'instagram-profile',
            { username, keyword, page, sourceUrl: entry.url },
            { removeOnComplete: true }
          );
        }
      } else {
        await websiteQueue.add(
          'website-url',
          { url: entry.url, keyword, page },
          { removeOnComplete: true }
        );
      }
    }

    for (const ig of result.instagramProfiles) {
      await instagramQueue.add(
        'instagram-profile',
        { username: ig, keyword, page },
        { removeOnComplete: true }
      );
    }

    keepGoing = result.hasResults;
    page += 1;
    if (page > 50) {
      logger.warn({ keyword }, 'Page cap reached');
      break;
    }
  }
};

new Worker(GOOGLE_QUEUE_NAME, processor, {
  concurrency: env.concurrencyGoogle,
  connection: redisConnection
});

logger.info('Google worker started');

