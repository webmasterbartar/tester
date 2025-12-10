import express from 'express';
import { env } from './config/env';
import apiRouter from './api';
import { logger } from './utils/logger';
import { connectMongo } from './config/db';
import './queues/googleQueue';
import './queues/websiteQueue';
import './queues/instagramQueue';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const start = async () => {
  await connectMongo();
  app.listen(env.port, () => {
    logger.info({ port: env.port }, 'API server running');
  });
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

