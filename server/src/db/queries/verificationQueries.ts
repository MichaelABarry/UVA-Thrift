import { pool } from '../pool';

export type VerificationTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
};

export async function createVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
  const result = await pool.query<VerificationTokenRecord>(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
}

export async function getValidVerificationToken(tokenHash: string) {
  const result = await pool.query<VerificationTokenRecord>(
    `SELECT * FROM email_verification_tokens
     WHERE token_hash = $1
     AND used_at IS NULL
     AND expires_at > NOW()`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function markVerificationTokenUsed(tokenId: string) {
  await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [tokenId]
  );
}

export async function invalidateUserVerificationTokens(userId: string) {
  await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}
