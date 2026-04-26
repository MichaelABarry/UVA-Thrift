import { pool } from '../pool';
import type { ListingRecord } from './listingQueries';

export type ListingWatchRecord = {
    user_id: string;
    listing_id: string;
    created_at: string;
};

export type ListingWatchRecipientRecord = {
    user_id: string;
    email: string;
};

export async function createListingWatch(userId: string, listingId: string) {
    const result = await pool.query<ListingWatchRecord>(
        `INSERT INTO listing_watch_subscriptions (user_id, listing_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, listing_id) DO NOTHING
        RETURNING *`,
        [userId, listingId]
    );

    return result.rows[0] ?? null;
}

export async function deleteListingWatch(userId: string, listingId: string) {
    const result = await pool.query<ListingWatchRecord>(
        `DELETE FROM listing_watch_subscriptions
        WHERE user_id = $1 AND listing_id = $2
        RETURNING *`,
        [userId, listingId]
    );

    return result.rows[0] ?? null;
}

export async function findListingWatch(userId: string, listingId: string) {
    const result = await pool.query<ListingWatchRecord>(
        `SELECT * FROM listing_watch_subscriptions
        WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId]
    );

    return result.rows[0] ?? null;
}

export async function findWatchedListingsByUserId(userId: string) {
    const result = await pool.query<ListingRecord>(
        `SELECT l.*
        FROM listing_watch_subscriptions s
        JOIN listings l ON l.id = s.listing_id
        WHERE s.user_id = $1
          AND l.deleted_at IS NULL
        ORDER BY s.created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function findListingWatchRecipients(listingId: string, excludedUserId?: string) {
    const params = excludedUserId ? [listingId, excludedUserId] : [listingId];
    const exclusionClause = excludedUserId ? 'AND s.user_id <> $2' : '';

    const result = await pool.query<ListingWatchRecipientRecord>(
        `SELECT DISTINCT u.id AS user_id, u.email
        FROM listing_watch_subscriptions s
        JOIN users u ON u.id = s.user_id
        WHERE s.listing_id = $1
          AND u.is_email_verified = TRUE
          ${exclusionClause}`,
        params
    );

    return result.rows;
}