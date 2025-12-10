import { Worker, Job } from 'bullmq';
import { INSTAGRAM_QUEUE_NAME } from '../queues/instagramQueue';
import { redisConnection } from '../config/redis';
import { InstagramScraper } from '../services/instagramScraper';
import { env } from '../config/env';
import { connectMongo } from '../config/db';
import { ResultModel } from '../models/result';
import { logger } from '../utils/logger';

const scraper = new InstagramScraper();

const processor = async (job: Job) => {
  await connectMongo();
  const { username, keyword, page, sourceUrl } = job.data as {
    username: string;
    keyword: string;
    page: number;
    sourceUrl?: string;
  };
  try {
    const res = await scraper.scrape(username);
    await ResultModel.findOneAndUpdate(
      { keyword, url: sourceUrl || `https://www.instagram.com/${username}/` },
      { keyword, url: sourceUrl || `https://www.instagram.com/${username}/`, page, instagram: username, phone: res.phone },
      { upsert: true }
    );
    logger.info({ username, keyword }, 'Instagram scraped and saved');
  } catch (err) {
    logger.error({ err, username }, 'Instagram worker failed');
    throw err;
  }
};

new Worker(INSTAGRAM_QUEUE_NAME, processor, {
  concurrency: env.concurrencyInstagram,
  connection: redisConnection
});

logger.info('Instagram worker started');

