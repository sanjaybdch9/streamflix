import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { withServer } from './helpers.js';

function memoryLibrary() {
  const watchlist = new Map();
  const progress = new Map();
  const key = (u, t) => `${u}:${t}`;
  return {
    watchlist: async (u) => [...watchlist.values()].filter((w) => w.userId === u).map(({ titleId, addedAt }) => ({ titleId, addedAt })),
    addToWatchlist: async (u, t) => watchlist.set(key(u, t), { userId: u, titleId: t, addedAt: new Date() }),
    removeFromWatchlist: async (u, t) => watchlist.delete(key(u, t)),
    progress: async (u, { titleId } = {}) =>
      [...progress.values()].filter((p) => p.userId === u && (!titleId || p.titleId === titleId)).map(({ userId, ...p }) => p),
    saveProgress: async (u, p) => {
      const row = { userId: u, ...p, updatedAt: new Date() };
      progress.set(key(u, p.titleId), row);
      const { userId, ...rest } = row;
      return rest;
    },
  };
}

const catalog = {
  titlesByIds: async (ids) => new Map(ids.map((id) => [id, { id, title: id.toUpperCase() }])),
};

const USER = { 'x-user-id': '6f1c2a8e-1111-4c2b-9d1e-000000000001', 'content-type': 'application/json' };

test('requires an authenticated user', async () => {
  await withServer(createApp({ library: memoryLibrary(), catalog }), async (base) => {
    assert.equal((await fetch(`${base}/library/watchlist`)).status, 401);
  });
});

test('watchlist add, list and remove', async () => {
  await withServer(createApp({ library: memoryLibrary(), catalog }), async (base) => {
    assert.equal((await fetch(`${base}/library/watchlist/drift`, { method: 'PUT', headers: USER })).status, 204);
    const list = await (await fetch(`${base}/library/watchlist`, { headers: USER })).json();
    assert.equal(list.items[0].title.title, 'DRIFT');
    await fetch(`${base}/library/watchlist/drift`, { method: 'DELETE', headers: USER });
    assert.equal((await (await fetch(`${base}/library/watchlist`, { headers: USER })).json()).items.length, 0);
  });
});

test('progress feeds continue watching until nearly finished', async () => {
  await withServer(createApp({ library: memoryLibrary(), catalog }), async (base) => {
    const save = (pos) =>
      fetch(`${base}/library/progress/bloom`, {
        method: 'PUT',
        headers: USER,
        body: JSON.stringify({ positionSeconds: pos, durationSeconds: 100 }),
      });
    assert.equal((await save(40)).status, 200);
    let cw = await (await fetch(`${base}/library/continue-watching`, { headers: USER })).json();
    assert.equal(cw.items[0].titleId, 'bloom');

    await save(99);
    cw = await (await fetch(`${base}/library/continue-watching`, { headers: USER })).json();
    assert.equal(cw.items.length, 0);

    const { progress } = await (await fetch(`${base}/library/progress/bloom`, { headers: USER })).json();
    assert.equal(progress.completed, true);
  });
});
