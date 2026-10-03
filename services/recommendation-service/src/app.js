import express from 'express';
import { HttpError, errorHandler, instrument, notFound } from './lib/observability.js';
import { recommend, similar } from './recommender.js';

const ID_RE = /^[a-z0-9-]{1,80}$/;

export function createApp({ services, readiness, logger }) {
  const app = express();
  app.disable('x-powered-by');
  const { client, register } = instrument(app, 'recommendation-service', { readiness, logger });

  const served = new client.Counter({
    name: 'recommendations_served_total',
    help: 'Recommendation responses by strategy',
    labelNames: ['strategy'],
    registers: [register],
  });

  app.get('/recommendations', async (req, res) => {
    const userId = req.get('x-user-id');
    if (!userId) throw new HttpError(401, 'Not authenticated');
    const titles = await services.allTitles();

    let signals = { history: [], watchlist: [] };
    try {
      signals = await services.signals(userId);
    } catch (err) {
      // Fall back to popularity if the library service is down.
      req.log.warn({ err: err.message }, 'library-service unavailable, using popularity fallback');
    }

    const result = recommend({ titles, ...signals, limit: Math.min(Number(req.query.limit) || 12, 50) });
    served.inc({ strategy: result.personalized ? 'personalized' : 'popular' });
    res.json(result);
  });

  app.get('/recommendations/similar/:titleId', async (req, res) => {
    if (!ID_RE.test(req.params.titleId)) throw new HttpError(400, 'Invalid title id');
    const items = similar({ titles: await services.allTitles(), titleId: req.params.titleId });
    served.inc({ strategy: 'similar' });
    res.json({ items });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
