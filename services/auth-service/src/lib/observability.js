// Logging, Prometheus metrics, health and error handling shared by every service.
// Each service keeps its own copy of this file (src/lib/observability.js) so that
// services stay independently buildable and deployable. Edit the copy in
// services/_shared/ and run `scripts/sync-shared.sh` to propagate changes.
import client from 'prom-client';
import pino from 'pino';
import pinoHttp from 'pino-http';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createLogger(serviceName) {
  return pino({ level: process.env.LOG_LEVEL || 'info', base: { service: serviceName } });
}

export function instrument(app, serviceName, { readiness, logger = createLogger(serviceName) } = {}) {
  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register });

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  const quiet = new Set(['/health', '/ready', '/metrics']);
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => quiet.has(req.url) },
    })
  );

  app.use((req, res, next) => {
    if (quiet.has(req.path)) return next();
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      end({ method: req.method, route, status: res.statusCode });
    });
    next();
  });

  // Liveness: the process is up. Readiness: dependencies (DB, cache) are reachable.
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: serviceName }));
  app.get('/ready', async (_req, res) => {
    try {
      if (readiness) await readiness();
      res.json({ status: 'ready', service: serviceName });
    } catch (err) {
      res.status(503).json({ status: 'not-ready', service: serviceName, error: err.message });
    }
  });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  return { register, client };
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) req.log?.error({ err }, 'request failed');
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}

// Stop accepting connections, let in-flight requests finish, then close resources.
export function gracefulShutdown(server, log, closers = []) {
  const shutdown = async (signal) => {
    log.info({ signal }, 'shutting down');
    server.close(async () => {
      for (const close of closers) {
        try {
          await close();
        } catch (err) {
          log.error({ err }, 'error during shutdown');
        }
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
