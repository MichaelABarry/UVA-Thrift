import { Pool } from 'pg';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

// Create a PostgreSQL connection pool using the connection string from environment variables. In production, SSL is enabled.
export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});
