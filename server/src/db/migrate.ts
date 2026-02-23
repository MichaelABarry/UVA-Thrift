import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { pool } from './pool';

// This script runs all SQL migration files in the migrations directory. 
// It creates a schema_migrations table to track which migrations have been applied, and applies any new migrations in order. Run this with `npm run migrate` from the server directory.
async function runMigrations() {

    // Look for the migrations directory in several possible locations to support different execution contexts (e.g. running from project root vs server directory).
    const candidates = [
        path.resolve(process.cwd(), 'migrations'),
        path.resolve(process.cwd(), 'server/migrations'),
        path.resolve(__dirname, '../../migrations')
    ];
    const migrationsDir = candidates.find((candidate) => existsSync(candidate));

    if (!migrationsDir) {
        throw new Error('Unable to locate migrations directory.');
    }

    // Read all .sql files from the migrations directory and sort them to ensure they are applied in the correct order.
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

    // Create the schema_migrations table if it doesn't exist. This table tracks which migrations have been applied.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // For each migration file
    for (const file of files) {

        // Check if this migration has already been applied by looking for its filename in the schema_migrations table.
        const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);

        // If the migration has already been applied, skip it.
        if (alreadyApplied.rowCount) {
            continue;
        }

        // Read the SQL from the migration file.
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');

        // Run the SQL in a transaction. If it succeeds, insert a record into schema_migrations to mark it as applied. If it fails, roll back the transaction and throw the error.
        await pool.query('BEGIN');
        try {
            await pool.query(sql);
            await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            await pool.query('COMMIT');
            console.log(`Applied migration: ${file}`);
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    }

    console.log('Migrations complete.');
    await pool.end();
}

runMigrations().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
