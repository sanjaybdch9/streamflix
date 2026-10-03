import express from 'express';
import { HttpError, errorHandler, instrument, notFound } from './lib/observability.js';

const ID_RE = /^[a-z0-9-]{1,80}$/;
// Past this fraction a title counts as watched and leaves "Continue Watching".
const COMPLETE_AT = 0.95;

export function createApp({ library, catalog, readiness, logger }) {
  const app = express();
  app.disable('x-powered-by');
  const { client, register } = instrument(app, 'library-service', { readiness, logger });
  app.use(express.json({ limit: '8kb' }));

  const progressUpdates = new client.Counter({
    name: 'library_progress_updates_total',
    help: 'Playback progress heartbeats received',
    registers: [register],
  });

  // The gateway verified the JWT; trust its forwarded identity.
  app.use('/library', (req, _res, next) => {
    req.userId = req.get('x-user-id');
    if (!req.userId) return next(new HttpError(401, 'Not authenticated'));
    next();
  });

  const titleIdParam = (req) => {
    if (!ID_RE.test(req.params.titleId)) throw new HttpError(400, 'Invalid title id');
    return req.params.titleId;
  };

  // Attach catalog details; if the catalog is unavailable, degrade to ids only.
  const enrich = async (req, entries) => {
    try {
      const titles = await catalog.titlesByIds(entries.map((e) => e.titleId));
      return entries.filter((e) => titles.has(e.titleId)).map((e) => ({ ...e, title: titles.get(e.titleId) }));
    } catch (err) {
      req.log.warn({ err: err.message }, 'catalog unavailable, returning un-enriched entries');
      return entries;
    }
  };

  app.get('/library/watchlist', async (req, res) => {
    res.json({ items: await enrich(req, await library.watchlist(req.userId)) });
  });

  app.put('/library/watchlist/:titleId', async (req, res) => {
    await library.addToWatchlist(req.userId, titleIdParam(req));
    res.status(204).end();
  });

  app.delete('/library/watchlist/:titleId', async (req, res) => {
    await library.removeFromWatchlist(req.userId, titleIdParam(req));
    res.status(204).end();
  });

  app.get('/library/continue-watching', async (req, res) => {
    const inProgress = (await library.progress(req.userId, { limit: 50 })).filter((p) => !p.completed && p.positionSeconds > 5);
    res.json({ items: await enrich(req, inProgress.slice(0, 20)) });
  });

  app.get('/library/progress/:titleId', async (req, res) => {
    const [progress] = await library.progress(req.userId, { titleId: titleIdParam(req) });
    res.json({ progress: progress || null });
  });

  app.put('/library/progress/:titleId', async (req, res) => {
    const positionSeconds = Number(req.body?.positionSeconds);
    const durationSeconds = Number(req.body?.durationSeconds);
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) throw new HttpError(400, 'positionSeconds must be >= 0');
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new HttpError(400, 'durationSeconds must be > 0');
    const progress = await library.saveProgress(req.userId, {
      titleId: titleIdParam(req),
      positionSeconds: Math.min(positionSeconds, durationSeconds),
      durationSeconds,
      completed: positionSeconds / durationSeconds >= COMPLETE_AT,
    });
    progressUpdates.inc();
    res.json({ progress });
  });

  // Raw viewing signals (no catalog join) for recommendation-service.
  app.get('/library/signals', async (req, res) => {
    const [history, watchlist] = await Promise.all([library.progress(req.userId, { limit: 100 }), library.watchlist(req.userId)]);
    res.json({ history, watchlist });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
