import { createApp } from './app.js';
import { createCache } from './cache.js';
import { connectDatabase } from './lib/db.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';
import { migrations, titleRepository } from './repository.js';
import { retiredVideoUrls } from './seed.js';

const log = createLogger('catalog-service');
const port = Number(process.env.PORT || 4002);

const pool = await connectDatabase({ connectionString: process.env.DATABASE_URL, migrations, log });
const titles = titleRepository(pool);
log.info(await titles.syncSeed(), 'demo catalog synced');

const cache = createCache({ url: process.env.REDIS_URL, log });
const repaired = await titles.replaceVideoUrls(retiredVideoUrls);
if (repaired) log.info({ repaired }, 'replaced retired video sources');
// Cached responses may predate the sync above.
await cache.invalidateAll();
const app = createApp({
  titles,
  cache,
  readiness: () => pool.query('SELECT 1'),
  logger: log,
});

const server = app.listen(port, () => log.info({ port }, 'catalog-service listening'));
gracefulShutdown(server, log, [() => cache.close(), () => pool.end()]);
