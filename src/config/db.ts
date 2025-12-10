import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let isConnected = false;

export const connectMongo = async (): Promise<typeof mongoose> => {
  if (isConnected) return mongoose;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUrl);
  isConnected = true;
  logger.info({ mongoUrl: env.mongoUrl }, 'MongoDB connected');
  return mongoose;
};

