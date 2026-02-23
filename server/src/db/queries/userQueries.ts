import { pool } from '../pool';

export type UserRecord = {
    id: string;
    email: string;
    password_hash: string;
    is_email_verified: boolean;
    created_at: string;
};

// Finds a user by their email address. Returns the user record if found, otherwise returns null.
export async function findUserByEmail(email: string) {
    const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ?? null;
}

// Finds a user by their ID. Returns the user record if found, otherwise returns null.
export async function findUserById(id: string) {
    const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
}

// Creates a new user with the given email and password hash. Returns the created user record.
export async function createUser(email: string, passwordHash: string) {
    const result = await pool.query<UserRecord>(
        `INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING *`,
        [email, passwordHash]
    );
    return result.rows[0];
}

// Marks a user's email as verified. Returns the updated user record if successful, otherwise returns null.
export async function markUserEmailVerified(userId: string) {
    const result = await pool.query<UserRecord>(
        `UPDATE users
        SET is_email_verified = TRUE, updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [userId]
    );
    return result.rows[0] ?? null;
}
