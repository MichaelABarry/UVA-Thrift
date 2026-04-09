import { pool } from '../pool';

export type VerificationTokenRecord = {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
};

// Creates a new verification token for the given user ID with the specified expiration time. Returns the created token record.
export async function createVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    const result = await pool.query<VerificationTokenRecord>(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [userId, tokenHash, expiresAt]
    );
    return result.rows[0];
}

// Retrieves a valid verification token by its hash. Returns the token record if it exists, is not used, and is not expired, otherwise returns null.
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

// Retrieves a verification token by its hash regardless of whether it has been used or expired.
export async function getVerificationTokenByHash(tokenHash: string) {
    const result = await pool.query<VerificationTokenRecord>(
        `SELECT * FROM email_verification_tokens
        WHERE token_hash = $1`,
        [tokenHash]
    );
    return result.rows[0] ?? null;
}

// Marks a verification token as used. Returns nothing.
export async function markVerificationTokenUsed(tokenId: string) {
    await pool.query(
        `UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1`,
        [tokenId]
    );
}

// Invalidates all unused verification tokens for a user. Returns nothing.
export async function invalidateUserVerificationTokens(userId: string) {
    await pool.query(
        `UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
    );
}
