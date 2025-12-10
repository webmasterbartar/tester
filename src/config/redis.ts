import IORedis, { RedisOptions } from 'ioredis';
import { env } from './env';

const options: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

export const redis = new IORedis(env.redisUrl, options);

export const redisConnection = redis;

