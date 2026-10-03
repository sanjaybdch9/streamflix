import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { memorylessCache } from '../src/cache.js';
import { seedTitles } from '../src/seed.js';
import { withServer } from './helpers.js';

function memoryTitles() {
  const store = new Map(seedTitles.map((t) => [t.id, { ...t }]));
  return {
    list: async ({ genre, q, ids, limit = 50 } = {}) =>
      [...store.values()]
        .filter((t) => !genre || t.genres.includes(genre))
        .filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()))
        .filter((t) => !ids || ids.includes(t.id))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit),
    get: async (id) => store.get(id),
    genres: async () => {
      const counts = {};
      for (const t of store.values()) for (const g of t.genres) counts[g] = (counts[g] || 0) + 1;
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
    save: async (t) => (store.set(t.id, t), t),
  };
}

const app = () => createApp({ titles: memoryTitles(), cache: memorylessCache() });

test('lists, filters and fetches titles', async () => {
  await withServer(app(), async (base) => {
    const all = await (await fetch(`${base}/catalog/titles`)).json();
    assert.equal(all.items.length, seedTitles.length);
    assert.equal(all.items[0].id, 'ember-protocol');

    const docs = await (await fetch(`${base}/catalog/titles?genre=Documentary`)).json();
    assert.ok(docs.items.every((t) => t.genres.includes('Documentary')));

    const byIds = await (await fetch(`${base}/catalog/titles?ids=drift,bloom`)).json();
    assert.deepEqual(byIds.items.map((t) => t.id).sort(), ['bloom', 'drift']);

    const drift = await (await fetch(`${base}/catalog/titles/drift`)).json();
    assert.equal(drift.title.videoUrl, undefined, 'source URL must not leak to clients');
    const source = await (await fetch(`${base}/internal/titles/drift/source`)).json();
    assert.match(source.videoUrl, /^https:/);
    assert.equal((await fetch(`${base}/catalog/titles/nope`)).status, 404);
  });
});

test('home screen has featured titles and rows', async () => {
  await withServer(app(), async (base) => {
    const home = await (await fetch(`${base}/catalog/home`)).json();
    assert.ok(home.featured.length > 0);
    assert.equal(home.rows[0].id, 'trending');
  });
});

test('only admins can add titles', async () => {
  await withServer(app(), async (base) => {
    const body = JSON.stringify({ id: 'new-title', title: 'New', videoUrl: 'https://example.com/v.mp4' });
    const headers = { 'content-type': 'application/json' };
    assert.equal((await fetch(`${base}/catalog/titles`, { method: 'POST', headers, body })).status, 403);
    const ok = await fetch(`${base}/catalog/titles`, { method: 'POST', headers: { ...headers, 'x-user-role': 'admin' }, body });
    assert.equal(ok.status, 201);
  });
});

test('exposes prometheus metrics', async () => {
  await withServer(app(), async (base) => {
    const text = await (await fetch(`${base}/metrics`)).text();
    assert.match(text, /http_request_duration_seconds/);
  });
});
