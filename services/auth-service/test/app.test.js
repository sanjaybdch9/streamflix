import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { withServer } from './helpers.js';

function memoryUsers() {
  const byId = new Map();
  return {
    findByEmail: async (email) => [...byId.values()].find((u) => u.email === email),
    findById: async (id) => byId.get(id),
    create: async ({ email, name, role, passwordHash }) => {
      const user = { id: randomUUID(), email, name, password_hash: passwordHash, role, created_at: new Date() };
      byId.set(user.id, user);
      return user;
    },
  };
}

const SECRET = 'test-secret';

test('register, login and fetch profile', async () => {
  const app = createApp({ users: memoryUsers(), jwtSecret: SECRET });
  await withServer(app, async (base) => {
    const body = { email: 'Ada@Example.com', name: 'Ada', password: 'supersecret' };
    const reg = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(reg.status, 201);
    const { token, user } = await reg.json();
    assert.equal(user.email, 'ada@example.com');
    assert.equal(jwt.verify(token, SECRET).sub, user.id);

    const dup = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(dup.status, 409);

    const bad = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: 'wrong-password' }),
    });
    assert.equal(bad.status, 401);

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    assert.equal(login.status, 200);

    const me = await fetch(`${base}/auth/me`, { headers: { 'x-user-id': user.id } });
    assert.equal((await me.json()).user.name, 'Ada');
  });
});

test('rejects weak passwords', async () => {
  const app = createApp({ users: memoryUsers(), jwtSecret: SECRET });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co', name: 'A', password: 'short' }),
    });
    assert.equal(res.status, 400);
  });
});
