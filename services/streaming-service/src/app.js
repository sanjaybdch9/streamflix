import express from 'express';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { HttpError, errorHandler, instrument, notFound } from './lib/observability.js';

const ID_RE = /^[a-z0-9-]{1,80}$/;
const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

// <video> elements cannot send an Authorization header, so playback uses short-lived
// signed URLs (like a CDN signed URL): an authenticated user requests a session, and
// the returned URL carries a token scoped to that one title.
export function createApp({ catalog, playbackSecret, allowedHosts, tokenTtl = '4h', readiness, logger }) {
  const app = express();
  app.disable('x-powered-by');
  const { client, register } = instrument(app, 'streaming-service', { readiness, logger });
  const hosts = new Set(allowedHosts);

  const sessions = new client.Counter({ name: 'stream_sessions_total', help: 'Playback sessions issued', registers: [register] });
  const starts = new client.Counter({
    name: 'stream_starts_total',
    help: 'Playback starts (first byte range requested)',
    labelNames: ['title'],
    registers: [register],
  });
  const bytesOut = new client.Counter({ name: 'stream_bytes_total', help: 'Video bytes delivered', registers: [register] });
  const active = new client.Gauge({ name: 'stream_active_connections', help: 'Open video connections', registers: [register] });

  const titleIdParam = (req) => {
    if (!ID_RE.test(req.params.titleId)) throw new HttpError(400, 'Invalid title id');
    return req.params.titleId;
  };

  app.post('/stream/:titleId/session', async (req, res) => {
    const userId = req.get('x-user-id');
    if (!userId) throw new HttpError(401, 'Not authenticated');
    const titleId = titleIdParam(req);
    await catalog.source(titleId); // 404s for unknown titles
    const token = jwt.sign({ sub: userId, tid: titleId }, playbackSecret, { expiresIn: tokenTtl, audience: 'playback' });
    sessions.inc();
    res.json({ titleId, playbackUrl: `/api/stream/${titleId}/play?token=${encodeURIComponent(token)}` });
  });

  app.get('/stream/:titleId/play', async (req, res) => {
    const titleId = titleIdParam(req);
    let claims;
    try {
      claims = jwt.verify(String(req.query.token || ''), playbackSecret, { audience: 'playback' });
    } catch {
      throw new HttpError(401, 'Invalid or expired playback token');
    }
    if (claims.tid !== titleId) throw new HttpError(403, 'Token is not valid for this title');

    const { videoUrl } = await catalog.source(titleId);
    const source = new URL(videoUrl);
    // Only fetch from approved origins, so a bad catalog entry cannot turn this into an open proxy.
    if (!hosts.has(source.hostname)) throw new HttpError(403, 'Video origin not allowed');

    const range = req.get('range');
    if (!range || /^bytes=0-/.test(range)) starts.inc({ title: titleId });

    const controller = new AbortController();
    res.on('close', () => controller.abort());
    // Public video archives occasionally return a transient 5xx; one quick retry hides it from viewers.
    const fetchOrigin = () =>
      fetch(source, { headers: { 'accept-encoding': 'identity', ...(range ? { range } : {}) }, signal: controller.signal });
    let upstream = await fetchOrigin();
    if (upstream.status >= 500 && !controller.signal.aborted) {
      await upstream.body?.cancel();
      req.log.warn({ status: upstream.status, titleId }, 'origin error, retrying once');
      upstream = await fetchOrigin();
    }
    if (![200, 206, 416].includes(upstream.status) || !upstream.body) {
      req.log.warn({ status: upstream.status, titleId }, 'origin error');
      throw new HttpError(502, 'Video origin unavailable');
    }

    res.status(upstream.status);
    for (const h of PASS_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('cache-control', 'private, max-age=3600');

    active.inc();
    try {
      const body = Readable.fromWeb(upstream.body);
      body.on('data', (chunk) => bytesOut.inc(chunk.length));
      await pipeline(body, res);
    } catch (err) {
      // Viewers seek and close tabs constantly; an aborted stream is normal.
      if (err.name !== 'AbortError' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') req.log.warn({ err: err.message }, 'stream error');
    } finally {
      active.dec();
    }
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
