import { Pool } from 'pg';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});
