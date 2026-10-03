import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { errorHandler, instrument, notFound } from './lib/observability.js';

// Single entry point for the frontend: authenticates the caller once, then forwards
// to the owning service with a trusted identity (x-user-id / x-user-role).
export function routeTable(urls) {
  return [
    { prefix: '/api/auth', target: urls.auth, isPublic: (p) => p === '/api/auth/login' || p === '/api/auth/register' },
    { prefix: '/api/catalog', target: urls.catalog },
    { prefix: '/api/library', target: urls.library },
    // Video playback authenticates with a signed token in the URL instead of a bearer header.
    { prefix: '/api/stream', target: urls.streaming, isPublic: (p) => /^\/api\/stream\/[a-z0-9-]+\/play$/.test(p), streaming: true },
    { prefix: '/api/recommendations', target: urls.recommendations },
  ];
}

const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-email'];

export function createApp({ urls, jwtSecret, rateLimitPerMinute = 300, trustProxy = 1, logger }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  const { client, register } = instrument(app, 'api-gateway', { logger });
  const routes = routeTable(urls);

  const upstreamErrors = new client.Counter({
    name: 'gateway_upstream_errors_total',
    help: 'Failed proxy calls by upstream',
    labelNames: ['upstream'],
    registers: [register],
  });

  const isPlayback = (req) => /^\/api\/stream\/[a-z0-9-]+\/play$/.test(req.path);
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: rateLimitPerMinute, standardHeaders: 'draft-7', legacyHeaders: false, skip: isPlayback })
  );
  app.use(['/api/auth/login', '/api/auth/register'], rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

  // Aggregated health of every downstream service, for dashboards and smoke tests.
  app.get('/api/status', async (_req, res) => {
    const checks = await Promise.all(
      Object.entries(urls).map(async ([name, base]) => {
        const started = Date.now();
        try {
          const r = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(2000) });
          return { name, status: r.ok ? 'up' : 'degraded', latencyMs: Date.now() - started };
        } catch {
          return { name, status: 'down', latencyMs: Date.now() - started };
        }
      })
    );
    const healthy = checks.every((c) => c.status === 'up');
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', services: checks });
  });

  app.use('/api', (req, res, next) => {
    // Never trust identity headers from the outside world.
    for (const h of IDENTITY_HEADERS) delete req.headers[h];
    req.headers['x-request-id'] ||= randomUUID();

    const route = routes.find((r) => req.originalUrl.startsWith(r.prefix));
    if (!route) return next();
    if (route.isPublic?.(req.originalUrl.split('?')[0])) return next();

    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Authentication required' });
    try {
      const claims = jwt.verify(token, jwtSecret, { issuer: 'streamflix-auth' });
      req.headers['x-user-id'] = claims.sub;
      req.headers['x-user-role'] = claims.role || 'member';
      req.headers['x-user-email'] = claims.email || '';
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  for (const route of routes) {
    app.use(
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        pathFilter: route.prefix,
        pathRewrite: { '^/api': '' },
        // Video responses can stream for a long time; API calls should fail fast.
        proxyTimeout: route.streaming ? 0 : 15_000,
        on: {
          error: (err, req, res) => {
            upstreamErrors.inc({ upstream: route.prefix });
            req.log?.error({ err: err.message, upstream: route.target }, 'upstream error');
            if (!res.headersSent && typeof res.status === 'function') {
              res.status(502).json({ error: 'Service temporarily unavailable' });
            } else {
              res.end?.();
            }
          },
        },
      })
    );
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
