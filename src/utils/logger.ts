import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { env } from '../config/env';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = pino(
  {
    level: env.logLevel,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime
  },
  pino.multistream([
    { stream: pino.destination({ dest: path.join(logsDir, 'app.log'), mkdir: true }) },
    { stream: process.stdout }
  ])
);

