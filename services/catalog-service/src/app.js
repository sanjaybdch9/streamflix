import express from 'express';
import { HttpError, errorHandler, instrument, notFound } from './lib/observability.js';

const ID_RE = /^[a-z0-9-]{1,80}$/;

// Source URLs stay inside the cluster: clients play video through the streaming service.
const publicTitle = ({ videoUrl, ...title }) => title;

export function createApp({ titles, cache, readiness, logger }) {
  const app = express();
  app.disable('x-powered-by');
  const { client, register } = instrument(app, 'catalog-service', { readiness, logger });
  app.use(express.json({ limit: '64kb' }));

  const cacheLookups = new client.Counter({
    name: 'catalog_cache_lookups_total',
    help: 'Catalog cache lookups by result',
    labelNames: ['result'],
    registers: [register],
  });

  const cached = async (key, ttl, load) => {
    const { value, hit } = await cache.getOrSet(key, ttl, load);
    cacheLookups.inc({ result: hit ? 'hit' : 'miss' });
    return value;
  };

  app.get('/catalog/titles', async (req, res) => {
    const genre = req.query.genre ? String(req.query.genre) : undefined;
    const q = req.query.q ? String(req.query.q).slice(0, 100) : undefined;
    const ids = req.query.ids ? String(req.query.ids).split(',').filter((id) => ID_RE.test(id)).slice(0, 200) : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const load = () => titles.list({ genre, q, ids, limit, offset });
    // Free-text search is too varied to be worth caching.
    const items = q ? await load() : await cached(`list:${genre || ''}:${ids?.join(',') || ''}:${limit}:${offset}`, 60, load);
    res.json({ items: items.map(publicTitle) });
  });

  app.get('/catalog/titles/:id', async (req, res) => {
    if (!ID_RE.test(req.params.id)) throw new HttpError(400, 'Invalid title id');
    const title = await cached(`title:${req.params.id}`, 300, () => titles.get(req.params.id));
    if (!title) throw new HttpError(404, 'Title not found');
    res.json({ title: publicTitle(title) });
  });

  // Internal only (the gateway exposes /catalog/* and nothing else): used by streaming-service.
  app.get('/internal/titles/:id/source', async (req, res) => {
    if (!ID_RE.test(req.params.id)) throw new HttpError(400, 'Invalid title id');
    const title = await cached(`title:${req.params.id}`, 300, () => titles.get(req.params.id));
    if (!title) throw new HttpError(404, 'Title not found');
    res.json({ id: title.id, videoUrl: title.videoUrl });
  });

  app.get('/catalog/genres', async (_req, res) => {
    res.json({ genres: await cached('genres', 300, () => titles.genres()) });
  });

  // Everything the home screen needs in one round trip: hero titles plus genre rows.
  app.get('/catalog/home', async (_req, res) => {
    const home = await cached('home', 60, async () => {
      const all = await titles.list({ limit: 200 });
      const genres = await titles.genres();
      const pub = all.map(publicTitle);
      const rows = [
        { id: 'trending', title: 'Trending Now', items: pub.slice(0, 12) },
        { id: 'new', title: 'New Releases', items: [...pub].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 12) },
        { id: 'series', title: 'Binge-worthy Series', items: pub.filter((t) => t.kind === 'series') },
        ...genres
          .filter((g) => g.count >= 3)
          .map((g) => ({ id: `genre-${g.name.toLowerCase()}`, title: g.name, items: pub.filter((t) => t.genres.includes(g.name)) })),
      ];
      return { featured: pub.filter((t) => t.featured), rows };
    });
    res.json(home);
  });

  app.post('/catalog/titles', async (req, res) => {
    if (req.get('x-user-role') !== 'admin') throw new HttpError(403, 'Admin role required');
    const t = req.body || {};
    if (!ID_RE.test(String(t.id || ''))) throw new HttpError(400, 'id must be a lowercase slug');
    if (!t.title || !t.videoUrl) throw new HttpError(400, 'title and videoUrl are required');
    if (!/^https:\/\//.test(t.videoUrl)) throw new HttpError(400, 'videoUrl must be https');
    const saved = await titles.save(t);
    await cache.invalidateAll();
    res.status(201).json({ title: publicTitle(saved) });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
