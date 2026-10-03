import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError, errorHandler, instrument, notFound } from './lib/observability.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createApp({ users, jwtSecret, tokenTtl = '12h', adminEmails = [], readiness, logger }) {
  const app = express();
  app.disable('x-powered-by');
  const { client, register } = instrument(app, 'auth-service', { readiness, logger });
  app.use(express.json({ limit: '16kb' }));

  const authEvents = new client.Counter({
    name: 'auth_events_total',
    help: 'Authentication events',
    labelNames: ['event'],
    registers: [register],
  });

  const issueToken = (user) =>
    jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, jwtSecret, {
      expiresIn: tokenTtl,
      issuer: 'streamflix-auth',
    });

  const publicUser = ({ id, email, name, role, created_at }) => ({ id, email, name, role, createdAt: created_at });

  app.post('/auth/register', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');
    if (name.length < 1 || name.length > 80) throw new HttpError(400, 'Name must be 1-80 characters');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    if (await users.findByEmail(email)) throw new HttpError(409, 'An account with this email already exists');
    const role = adminEmails.includes(email) ? 'admin' : 'member';
    const user = await users.create({ email, name, role, passwordHash: await bcrypt.hash(password, 10) });
    authEvents.inc({ event: 'register' });
    res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  });

  app.post('/auth/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = await users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      authEvents.inc({ event: 'login_failed' });
      throw new HttpError(401, 'Invalid email or password');
    }
    authEvents.inc({ event: 'login' });
    res.json({ token: issueToken(user), user: publicUser(user) });
  });

  // The gateway has already verified the JWT and forwards the user id.
  app.get('/auth/me', async (req, res) => {
    const userId = req.get('x-user-id');
    if (!userId) throw new HttpError(401, 'Not authenticated');
    const user = await users.findById(userId);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: publicUser(user) });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
