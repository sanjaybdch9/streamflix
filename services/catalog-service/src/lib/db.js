// PostgreSQL helpers shared by the stateful services (database-per-service pattern).
// Each service keeps its own copy (src/lib/db.js); see services/_shared/observability.js.
import pg from 'pg';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Each service owns its own database. Create it on first start so the same image
// works against docker-compose Postgres, the in-cluster StatefulSet, or AWS RDS.
async function ensureDatabase(connectionString) {
  const url = new URL(connectionString);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } catch (err) {
    // Another replica created it at the same moment.
    if (err.code !== '42P04' && err.code !== '23505') throw err;
  } finally {
    await admin.end();
  }
}

export async function connectDatabase({ connectionString, migrations, log, attempts = 30 }) {
  for (let attempt = 1; ; attempt++) {
    try {
      await ensureDatabase(connectionString);
      const pool = new pg.Pool({ connectionString, max: Number(process.env.DB_POOL_SIZE || 10) });
      for (const sql of migrations) await pool.query(sql);
      log.info('database ready');
      return pool;
    } catch (err) {
      if (attempt >= attempts) throw err;
      log.warn({ attempt, err: err.message }, 'database not ready, retrying');
      await sleep(2000);
    }
  }
}
