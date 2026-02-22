import { pool } from '../pool';

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  is_email_verified: boolean;
  created_at: string;
};

export async function findUserByEmail(email: string) {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string) {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email, passwordHash]
  );
  return result.rows[0];
}

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
