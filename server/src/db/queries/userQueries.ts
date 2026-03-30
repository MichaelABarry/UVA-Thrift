import { pool } from '../pool';

export type UserRecord = {
    id: string;
    email: string;
    password_hash: string;
    is_email_verified: boolean;
    display_name: string | null;
    phone_number: string | null;
    venmo_username: string | null;
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

// Updates a user's optional profile fields. Returns the updated user record.
export async function updateUserProfile(
    userId: string,
    fields: { displayName: string | null; phoneNumber: string | null; venmoUsername: string | null }
) {
    const result = await pool.query<UserRecord>(
        `UPDATE users
        SET display_name   = $2,
            phone_number   = $3,
            venmo_username = $4,
            updated_at     = NOW()
        WHERE id = $1
        RETURNING *`,
        [userId, fields.displayName, fields.phoneNumber, fields.venmoUsername]
    );
    return result.rows[0] ?? null;
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
