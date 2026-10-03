export const migrations = [
  `CREATE TABLE IF NOT EXISTS watchlist (
     user_id  UUID NOT NULL,
     title_id TEXT NOT NULL,
     added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, title_id)
   )`,
  `CREATE TABLE IF NOT EXISTS watch_progress (
     user_id          UUID NOT NULL,
     title_id         TEXT NOT NULL,
     position_seconds REAL NOT NULL DEFAULT 0,
     duration_seconds REAL NOT NULL DEFAULT 0,
     completed        BOOLEAN NOT NULL DEFAULT false,
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, title_id)
   )`,
  'CREATE INDEX IF NOT EXISTS watch_progress_recent_idx ON watch_progress (user_id, updated_at DESC)',
];

const toProgress = (r) => ({
  titleId: r.title_id,
  positionSeconds: r.position_seconds,
  durationSeconds: r.duration_seconds,
  completed: r.completed,
  updatedAt: r.updated_at,
});

export function libraryRepository(pool) {
  return {
    async watchlist(userId) {
      const { rows } = await pool.query(
        'SELECT title_id, added_at FROM watchlist WHERE user_id = $1 ORDER BY added_at DESC',
        [userId]
      );
      return rows.map((r) => ({ titleId: r.title_id, addedAt: r.added_at }));
    },
    async addToWatchlist(userId, titleId) {
      await pool.query('INSERT INTO watchlist (user_id, title_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, titleId]);
    },
    async removeFromWatchlist(userId, titleId) {
      await pool.query('DELETE FROM watchlist WHERE user_id = $1 AND title_id = $2', [userId, titleId]);
    },
    async progress(userId, { titleId, limit = 50 } = {}) {
      const { rows } = titleId
        ? await pool.query('SELECT * FROM watch_progress WHERE user_id = $1 AND title_id = $2', [userId, titleId])
        : await pool.query('SELECT * FROM watch_progress WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2', [userId, limit]);
      return rows.map(toProgress);
    },
    async saveProgress(userId, { titleId, positionSeconds, durationSeconds, completed }) {
      const { rows } = await pool.query(
        `INSERT INTO watch_progress (user_id, title_id, position_seconds, duration_seconds, completed, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id, title_id) DO UPDATE SET
           position_seconds = EXCLUDED.position_seconds, duration_seconds = EXCLUDED.duration_seconds,
           completed = EXCLUDED.completed, updated_at = now()
         RETURNING *`,
        [userId, titleId, positionSeconds, durationSeconds, completed]
      );
      return toProgress(rows[0]);
    },
  };
}
