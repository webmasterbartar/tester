import { env } from './env';

const proxies = (env.proxyList || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

export const getRandomProxy = (): string | null => {
  if (!proxies.length) return null;
  const idx = Math.floor(Math.random() * proxies.length);
  return proxies[idx];
};

export const getProxies = (): string[] => proxies;

