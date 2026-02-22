import { pool } from '../pool';

export type SessionRecord = {
  id: string;
  user_id: string;
  expires_at: string;
};

export async function createSession(userId: string, expiresAt: Date) {
  const result = await pool.query<SessionRecord>(
    `INSERT INTO sessions (user_id, expires_at)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, expiresAt]
  );
  return result.rows[0];
}

export async function getValidSessionById(sessionId: string) {
  const result = await pool.query<SessionRecord>(
    `SELECT * FROM sessions
     WHERE id = $1 AND expires_at > NOW()`,
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(sessionId: string) {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

export async function deleteExpiredSessions() {
  await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
}
