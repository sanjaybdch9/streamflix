export const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email         TEXT NOT NULL UNIQUE,
     name          TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     role          TEXT NOT NULL DEFAULT 'member',
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
];

export function userRepository(pool) {
  return {
    async findByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return rows[0];
    },
    async findById(id) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0];
    },
    async create({ email, name, role, passwordHash }) {
      const { rows } = await pool.query(
        'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, name, role, passwordHash]
      );
      return rows[0];
    },
  };
}
