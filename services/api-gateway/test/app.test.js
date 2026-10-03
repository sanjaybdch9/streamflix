import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { withServer } from './helpers.js';

const SECRET = 'gw-secret';

// A stand-in for every downstream service that echoes what it received.
function echoService() {
  const app = express();
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));
  app.use((req, res) =>
    res.json({ path: req.originalUrl, userId: req.get('x-user-id') || null, role: req.get('x-user-role') || null })
  );
  return app;
}

async function setup(fn) {
  await withServer(echoService(), async (upstream) => {
    const urls = { auth: upstream, catalog: upstream, library: upstream, streaming: upstream, recommendations: upstream };
    await withServer(createApp({ urls, jwtSecret: SECRET }), fn);
  });
}

const token = (claims = {}) => jwt.sign({ sub: 'user-1', role: 'member', ...claims }, SECRET, { issuer: 'streamflix-auth' });

test('login and register are public and rewritten', async () => {
  await setup(async (base) => {
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).path, '/auth/login');
  });
});

test('protected routes require a valid token', async () => {
  await setup(async (base) => {
    assert.equal((await fetch(`${base}/api/catalog/home`)).status, 401);
    assert.equal((await fetch(`${base}/api/catalog/home`, { headers: { authorization: 'Bearer junk' } })).status, 401);
    const wrongIssuer = jwt.sign({ sub: 'x' }, SECRET);
    assert.equal((await fetch(`${base}/api/library/watchlist`, { headers: { authorization: `Bearer ${wrongIssuer}` } })).status, 401);
  });
});

test('forwards verified identity and strips spoofed headers', async () => {
  await setup(async (base) => {
    const res = await fetch(`${base}/api/library/watchlist`, {
      headers: { authorization: `Bearer ${token()}`, 'x-user-id': 'attacker', 'x-user-role': 'admin' },
    });
    const body = await res.json();
    assert.equal(body.path, '/library/watchlist');
    assert.equal(body.userId, 'user-1');
    assert.equal(body.role, 'member');

    const anon = await (await fetch(`${base}/api/stream/drift/play?token=t`, { headers: { 'x-user-id': 'attacker' } })).json();
    assert.equal(anon.userId, null, 'public routes must not carry spoofed identity');
  });
});

test('aggregates downstream health', async () => {
  await setup(async (base) => {
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.status, 'ok');
    assert.equal(status.services.length, 5);
  });
});

test('returns 502 when a service is down', async () => {
  const urls = { auth: 'http://127.0.0.1:9', catalog: 'http://127.0.0.1:9', library: 'http://127.0.0.1:9', streaming: 'http://127.0.0.1:9', recommendations: 'http://127.0.0.1:9' };
  await withServer(createApp({ urls, jwtSecret: SECRET }), async (base) => {
    const res = await fetch(`${base}/api/catalog/home`, { headers: { authorization: `Bearer ${token()}` } });
    assert.equal(res.status, 502);
  });
});
