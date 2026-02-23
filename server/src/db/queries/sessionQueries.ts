import { pool } from '../pool';

// Type definition for a session record returned from the database.
export type SessionRecord = {
    id: string;
    user_id: string;
    expires_at: string;
};

// Creates a new session for the given user ID with the specified expiration time. Returns the created session record.
export async function createSession(userId: string, expiresAt: Date) {
    const result = await pool.query<SessionRecord>(
        `INSERT INTO sessions (user_id, expires_at)
        VALUES ($1, $2)
        RETURNING *`,
        [userId, expiresAt]
    );
    return result.rows[0];
}

// Retrieves a valid session by its ID. Returns the session record if it exists and is not expired, otherwise returns null.
export async function getValidSessionById(sessionId: string) {
    const result = await pool.query<SessionRecord>(
        `SELECT * FROM sessions
        WHERE id = $1 AND expires_at > NOW()`,
        [sessionId]
    );
    return result.rows[0] ?? null;
}

// Deletes a session by its ID.
export async function deleteSession(sessionId: string) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

// Deletes all expired sessions.
export async function deleteExpiredSessions() {
    await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
}
