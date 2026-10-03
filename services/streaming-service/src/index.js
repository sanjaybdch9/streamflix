import { createApp } from './app.js';
import { catalogClient } from './catalog-client.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';

const log = createLogger('streaming-service');
const port = Number(process.env.PORT || 4004);
const playbackSecret = process.env.PLAYBACK_SECRET;
if (!playbackSecret) {
  log.fatal('PLAYBACK_SECRET is required');
  process.exit(1);
}

const defaultHosts = [
  'media.w3.org',
  'archive.org',
  'test-videos.co.uk',
  'interactive-examples.mdn.mozilla.net',
];
const allowedHosts = process.env.STREAM_ALLOWED_HOSTS
  ? process.env.STREAM_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
  : defaultHosts;

const catalogUrl = process.env.CATALOG_URL || 'http://catalog-service:4002';
const app = createApp({
  catalog: catalogClient(catalogUrl),
  playbackSecret,
  allowedHosts,
  readiness: async () => {
    const res = await fetch(`${catalogUrl}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('catalog-service unavailable');
  },
  logger: log,
});

const server = app.listen(port, () => log.info({ port, allowedHosts }, 'streaming-service listening'));
gracefulShutdown(server, log);
