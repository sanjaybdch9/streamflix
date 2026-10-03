import { createApp } from './app.js';
import { connectDatabase } from './lib/db.js';
import { createLogger, gracefulShutdown } from './lib/observability.js';
import { migrations, userRepository } from './repository.js';

const log = createLogger('auth-service');
const port = Number(process.env.PORT || 4001);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  log.fatal('JWT_SECRET is required');
  process.exit(1);
}

const pool = await connectDatabase({ connectionString: process.env.DATABASE_URL, migrations, log });
const app = createApp({
  users: userRepository(pool),
  jwtSecret,
  tokenTtl: process.env.TOKEN_TTL || '12h',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  readiness: () => pool.query('SELECT 1'),
  logger: log,
});

const server = app.listen(port, () => log.info({ port }, 'auth-service listening'));
gracefulShutdown(server, log, [() => pool.end()]);
