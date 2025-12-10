import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const WEBSITE_QUEUE_NAME = 'website-scrape';

export const websiteQueue = new Queue(WEBSITE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 2
  }
});

export const enqueueWebsite = async (payload: { url: string; keyword: string; page: number }) => {
  return websiteQueue.add('website-url', payload);
};

