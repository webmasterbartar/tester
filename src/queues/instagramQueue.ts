import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const INSTAGRAM_QUEUE_NAME = 'instagram-scrape';

export const instagramQueue = new Queue(INSTAGRAM_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3
  }
});

export const enqueueInstagram = async (payload: {
  username: string;
  keyword: string;
  page: number;
  sourceUrl?: string;
}) => {
  return instagramQueue.add('instagram-profile', payload);
};

