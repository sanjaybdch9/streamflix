import { createApp } from './app.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';

const log = createLogger('api-gateway');
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  log.fatal('JWT_SECRET is required');
  process.exit(1);
}

const urls = {
  auth: process.env.AUTH_URL || 'http://auth-service:4001',
  catalog: process.env.CATALOG_URL || 'http://catalog-service:4002',
  library: process.env.LIBRARY_URL || 'http://library-service:4003',
  streaming: process.env.STREAMING_URL || 'http://streaming-service:4004',
  recommendations: process.env.RECOMMENDATION_URL || 'http://recommendation-service:4005',
};

const app = createApp({
  urls,
  jwtSecret,
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 300),
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  logger: log,
});

const server = app.listen(port, () => log.info({ port, urls }, 'api-gateway listening'));
gracefulShutdown(server, log);
