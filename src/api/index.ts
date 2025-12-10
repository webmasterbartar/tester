import express from 'express';
import { enqueueGoogleKeyword } from '../queues/googleQueue';

const router = express.Router();

router.post('/scrape', async (req, res) => {
  const { keyword } = req.body as { keyword?: string };
  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }
  await enqueueGoogleKeyword(keyword);
  return res.json({ queued: true, keyword });
});

export default router;

