import { pool } from '../pool';

export type PasswordResetTokenRecord = {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
};

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    const result = await pool.query<PasswordResetTokenRecord>(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [userId, tokenHash, expiresAt]
    );
    return result.rows[0];
}

export async function getValidPasswordResetToken(tokenHash: string) {
    const result = await pool.query<PasswordResetTokenRecord>(
        `SELECT * FROM password_reset_tokens
        WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()`,
        [tokenHash]
    );
    return result.rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: string) {
    await pool.query(
        `UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1`,
        [tokenId]
    );
}

export async function invalidateUserPasswordResetTokens(userId: string) {
    await pool.query(
        `UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
    );
}