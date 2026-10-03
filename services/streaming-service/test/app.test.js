import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/lib/observability.js';
import { withServer } from './helpers.js';

const VIDEO = Buffer.alloc(1000, 7);

// A fake video origin that honours Range requests.
function origin() {
  const app = express();
  app.get('/video.mp4', (req, res) => {
    const m = /bytes=(\d+)-(\d*)/.exec(req.get('range') || '');
    res.setHeader('content-type', 'video/mp4');
    res.setHeader('accept-ranges', 'bytes');
    if (!m) return res.end(VIDEO);
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : VIDEO.length - 1;
    res.status(206).setHeader('content-range', `bytes ${start}-${end}/${VIDEO.length}`);
    res.end(VIDEO.subarray(start, end + 1));
  });
  return app;
}

async function setup(fn) {
  await withServer(origin(), async (originBase) => {
    const catalog = {
      source: async (id) => {
        if (id === 'missing') throw new HttpError(404, 'Title not found');
        return { id, videoUrl: id === 'evil' ? 'http://169.254.169.254/latest' : `${originBase}/video.mp4` };
      },
    };
    const app = createApp({ catalog, playbackSecret: 'pb-secret', allowedHosts: ['127.0.0.1'] });
    await withServer(app, fn);
  });
}

const session = async (base, titleId) => {
  const res = await fetch(`${base}/stream/${titleId}/session`, { method: 'POST', headers: { 'x-user-id': 'u1' } });
  return { status: res.status, body: await res.json() };
};
const playPath = (url) => url.replace('/api', '');

test('issues a signed URL and proxies byte ranges', async () => {
  await setup(async (base) => {
    const { status, body } = await session(base, 'drift');
    assert.equal(status, 200);

    const full = await fetch(base + playPath(body.playbackUrl));
    assert.equal(full.status, 200);
    assert.equal((await full.arrayBuffer()).byteLength, VIDEO.length);

    const part = await fetch(base + playPath(body.playbackUrl), { headers: { range: 'bytes=100-199' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), 'bytes 100-199/1000');
    assert.equal((await part.arrayBuffer()).byteLength, 100);
  });
});

test('rejects missing, forged and cross-title tokens', async () => {
  await setup(async (base) => {
    assert.equal((await fetch(`${base}/stream/drift/play`)).status, 401);
    assert.equal((await fetch(`${base}/stream/drift/play?token=forged`)).status, 401);
    const { body } = await session(base, 'bloom');
    const token = new URL(body.playbackUrl, 'http://x').searchParams.get('token');
    assert.equal((await fetch(`${base}/stream/drift/play?token=${token}`)).status, 403);
  });
});

test('requires auth for sessions and blocks unapproved origins', async () => {
  await setup(async (base) => {
    assert.equal((await fetch(`${base}/stream/drift/session`, { method: 'POST' })).status, 401);
    assert.equal((await session(base, 'missing')).status, 404);
    const { body } = await session(base, 'evil');
    assert.equal((await fetch(base + playPath(body.playbackUrl))).status, 403);
  });
});
