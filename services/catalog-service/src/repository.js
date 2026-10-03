import { seedTitles } from './seed.js';

export const migrations = [
  `CREATE TABLE IF NOT EXISTS titles (
     id               TEXT PRIMARY KEY,
     title            TEXT NOT NULL,
     synopsis         TEXT NOT NULL DEFAULT '',
     kind             TEXT NOT NULL DEFAULT 'movie',
     year             INT,
     maturity         TEXT,
     duration_minutes INT,
     genres           TEXT[] NOT NULL DEFAULT '{}',
     cast_members     TEXT[] NOT NULL DEFAULT '{}',
     palette          TEXT[] NOT NULL DEFAULT '{}',
     poster_url       TEXT,
     video_url        TEXT NOT NULL,
     popularity       INT NOT NULL DEFAULT 0,
     featured         BOOLEAN NOT NULL DEFAULT false,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  'CREATE INDEX IF NOT EXISTS titles_genres_idx ON titles USING GIN (genres)',
  'CREATE INDEX IF NOT EXISTS titles_popularity_idx ON titles (popularity DESC)',
];

export function toTitle(row) {
  return {
    id: row.id,
    title: row.title,
    synopsis: row.synopsis,
    kind: row.kind,
    year: row.year,
    maturity: row.maturity,
    durationMinutes: row.duration_minutes,
    genres: row.genres,
    cast: row.cast_members,
    palette: row.palette,
    posterUrl: row.poster_url,
    videoUrl: row.video_url,
    popularity: row.popularity,
    featured: row.featured,
  };
}

export function titleRepository(pool) {
  const upsert = (t) =>
    pool.query(
      `INSERT INTO titles (id, title, synopsis, kind, year, maturity, duration_minutes, genres,
                           cast_members, palette, poster_url, video_url, popularity, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, synopsis = EXCLUDED.synopsis, kind = EXCLUDED.kind, year = EXCLUDED.year,
         maturity = EXCLUDED.maturity, duration_minutes = EXCLUDED.duration_minutes, genres = EXCLUDED.genres,
         cast_members = EXCLUDED.cast_members, palette = EXCLUDED.palette, poster_url = EXCLUDED.poster_url,
         video_url = EXCLUDED.video_url, popularity = EXCLUDED.popularity, featured = EXCLUDED.featured
       RETURNING *`,
      [
        t.id, t.title, t.synopsis || '', t.kind || 'movie', t.year ?? null, t.maturity ?? null,
        t.durationMinutes ?? null, t.genres || [], t.cast || [], t.palette || [], t.posterUrl ?? null,
        t.videoUrl, t.popularity ?? 0, Boolean(t.featured),
      ]
    );

  return {
    async seedIfEmpty() {
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM titles');
      if (rows[0].n > 0) return 0;
      for (const t of seedTitles) await upsert(t);
      return seedTitles.length;
    },

    async list({ genre, q, ids, limit = 50, offset = 0 } = {}) {
      const where = [];
      const params = [];
      if (genre) {
        params.push(genre);
        where.push(`$${params.length} = ANY(genres)`);
      }
      if (q) {
        params.push(`%${q}%`);
        where.push(`(title ILIKE $${params.length} OR synopsis ILIKE $${params.length}
                     OR array_to_string(cast_members, ' ') ILIKE $${params.length})`);
      }
      if (ids) {
        params.push(ids);
        where.push(`id = ANY($${params.length})`);
      }
      params.push(limit, offset);
      const { rows } = await pool.query(
        `SELECT * FROM titles ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY popularity DESC, title
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return rows.map(toTitle);
    },

    async get(id) {
      const { rows } = await pool.query('SELECT * FROM titles WHERE id = $1', [id]);
      return rows[0] && toTitle(rows[0]);
    },

    async genres() {
      const { rows } = await pool.query(
        `SELECT g AS name, count(*)::int AS count FROM titles, unnest(genres) AS g
         GROUP BY g ORDER BY count DESC, g`
      );
      return rows;
    },

    async save(title) {
      const { rows } = await upsert(title);
      return toTitle(rows[0]);
    },
  };
}
