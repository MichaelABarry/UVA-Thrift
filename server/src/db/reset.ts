import { Pool } from 'pg';
import { env } from '../config/env';

async function resetDatabase() {
  const databaseUrl = new URL(env.DATABASE_URL);
  const databaseName = databaseUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  const adminUrl = new URL(env.DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({
    connectionString: adminUrl.toString(),
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1
       AND pid <> pg_backend_pid()`,
      [databaseName]
    );

    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);

    console.log(`Reset database: ${databaseName}`);
  } finally {
    await adminPool.end();
  }
}

resetDatabase().catch((error) => {
  console.error('Database reset failed:', error);
  process.exit(1);
});
