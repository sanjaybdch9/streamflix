import { createApp } from './app.js';
import { catalogClient } from './catalog-client.js';
import { connectDatabase } from './lib/db.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';
import { libraryRepository, migrations } from './repository.js';

const log = createLogger('library-service');
const port = Number(process.env.PORT || 4003);

const pool = await connectDatabase({ connectionString: process.env.DATABASE_URL, migrations, log });
const app = createApp({
  library: libraryRepository(pool),
  catalog: catalogClient(process.env.CATALOG_URL || 'http://catalog-service:4002'),
  readiness: () => pool.query('SELECT 1'),
  logger: log,
});

const server = app.listen(port, () => log.info({ port }, 'library-service listening'));
gracefulShutdown(server, log, [() => pool.end()]);
