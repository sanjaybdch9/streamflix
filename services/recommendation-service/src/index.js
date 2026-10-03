import { createApp } from './app.js';
import { serviceClients } from './clients.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';

const log = createLogger('recommendation-service');
const port = Number(process.env.PORT || 4005);
const catalogUrl = process.env.CATALOG_URL || 'http://catalog-service:4002';

const app = createApp({
  services: serviceClients({ catalogUrl, libraryUrl: process.env.LIBRARY_URL || 'http://library-service:4003' }),
  readiness: async () => {
    const res = await fetch(`${catalogUrl}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('catalog-service unavailable');
  },
  logger: log,
});

const server = app.listen(port, () => log.info({ port }, 'recommendation-service listening'));
gracefulShutdown(server, log);
