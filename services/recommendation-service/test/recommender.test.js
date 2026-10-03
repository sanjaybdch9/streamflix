import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, similar } from '../src/recommender.js';
import { createApp } from '../src/app.js';
import { withServer } from './helpers.js';

const titles = [
  { id: 'doc-a', title: 'Doc A', genres: ['Documentary', 'Nature'], popularity: 50 },
  { id: 'doc-b', title: 'Doc B', genres: ['Documentary', 'Nature'], popularity: 40 },
  { id: 'action-a', title: 'Action A', genres: ['Action', 'Thriller'], popularity: 99 },
  { id: 'comedy-a', title: 'Comedy A', genres: ['Comedy'], popularity: 70 },
];

test('falls back to popularity with no signals', () => {
  const { personalized, items } = recommend({ titles });
  assert.equal(personalized, false);
  assert.equal(items[0].id, 'action-a');
  assert.equal(items[0].reason, 'Popular on StreamFlix');
});

test('ranks titles from watched genres first and excludes seen titles', () => {
  const { personalized, items } = recommend({
    titles,
    history: [{ titleId: 'doc-a', positionSeconds: 90, durationSeconds: 100, completed: true }],
  });
  assert.equal(personalized, true);
  assert.equal(items[0].id, 'doc-b');
  assert.equal(items[0].reason, 'Because you watched Doc A');
  assert.ok(!items.some((t) => t.id === 'doc-a'));
});

test('similar titles share genres', () => {
  assert.deepEqual(similar({ titles, titleId: 'doc-a' }).map((t) => t.id), ['doc-b']);
});

test('still answers when the library service is down', async () => {
  const services = {
    allTitles: async () => titles,
    signals: async () => {
      throw new Error('down');
    },
  };
  await withServer(createApp({ services }), async (base) => {
    const res = await fetch(`${base}/recommendations`, { headers: { 'x-user-id': 'u1' } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).personalized, false);
  });
});
