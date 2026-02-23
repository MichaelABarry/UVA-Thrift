import { Pool } from 'pg';
import { env } from '../config/env';

// This script resets the database by connecting to the PostgreSQL server, terminating any active connections to the target database, dropping it if it exists, and then creating a new empty database with the same name. 
// Run this with `npm run reset-db` from the server directory. Use with caution as this will delete all data in the database.
async function resetDatabase() {

    // Parse the database name from the DATABASE_URL environment variable.
    const databaseUrl = new URL(env.DATABASE_URL);
    const databaseName = databaseUrl.pathname.replace(/^\//, '');

    if (!databaseName) {
        throw new Error('DATABASE_URL must include a database name.');
    }

    const adminUrl = new URL(env.DATABASE_URL);
    adminUrl.pathname = '/postgres';

    // Create a new connection pool to the default 'postgres' database to perform administrative tasks like dropping and creating the target database.
    const adminPool = new Pool({
        connectionString: adminUrl.toString(),
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {

        // Terminate all active connections to the target database to allow dropping it. This is necessary because PostgreSQL does not allow dropping a database while clients are connected to it.
        await adminPool.query(
            `SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1
            AND pid <> pg_backend_pid()`,
            [databaseName]
        );

        // Drop the target database if it exists. Then create a new empty database with the same name. This effectively resets the database to an empty state.
        await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        await adminPool.query(`CREATE DATABASE "${databaseName}"`);

        console.log(`Reset database: ${databaseName}`);
    } finally {

        // End the admin connection pool to free up resources.
        await adminPool.end();
    }
}

resetDatabase().catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
});
