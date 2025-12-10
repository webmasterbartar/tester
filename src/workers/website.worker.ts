import { Worker, Job } from 'bullmq';
import { WEBSITE_QUEUE_NAME } from '../queues/websiteQueue';
import { instagramQueue } from '../queues/instagramQueue';
import { redisConnection } from '../config/redis';
import { WebsiteScraper } from '../services/websiteScraper';
import { env } from '../config/env';
import { connectMongo } from '../config/db';
import { ResultModel } from '../models/result';
import { logger } from '../utils/logger';

const scraper = new WebsiteScraper();

const processor = async (job: Job) => {
  await connectMongo();
  const { url, keyword, page } = job.data as { url: string; keyword: string; page: number };
  try {
    const res = await scraper.scrape(url);
    if (res.phone) {
      await ResultModel.findOneAndUpdate(
        { keyword, url },
        { keyword, url, page, phone: res.phone },
        { upsert: true }
      );
      logger.info({ url, keyword }, 'Phone found and saved');
    } else if (res.instagram) {
      await instagramQueue.add(
        'instagram-profile',
        { username: res.instagram, keyword, page, sourceUrl: url },
        { removeOnComplete: true }
      );
    }
  } catch (err) {
    logger.error({ err, url }, 'Website worker failed');
    throw err;
  }
};

new Worker(WEBSITE_QUEUE_NAME, processor, {
  concurrency: env.concurrencyWebsite,
  connection: redisConnection
});

logger.info('Website worker started');

