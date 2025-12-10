import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const GOOGLE_QUEUE_NAME = 'google-scrape';

export const googleQueue = new Queue(GOOGLE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3
  }
});

export const enqueueGoogleKeyword = async (keyword: string) => {
  return googleQueue.add('google-keyword', { keyword });
};

