import { pool } from '../pool';

export type NotificationPreferenceRecord = {
    id: string;
    user_id: string;
    keywords: string[];
    categories: string[];
    created_at: string;
    updated_at: string;
};

export type NotificationRecipientRecord = {
    user_id: string;
    email: string;
};

export async function createNotificationPreference(input: {
    userId: string;
    keywords: string[];
    categories: string[];
}) {
    const result = await pool.query<NotificationPreferenceRecord>(
        `INSERT INTO listing_notification_preferences (user_id, keywords, categories)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [input.userId, input.keywords, input.categories]
    );

    return result.rows[0];
}

export async function findNotificationPreferencesByUserId(userId: string) {
    const result = await pool.query<NotificationPreferenceRecord>(
        `SELECT * FROM listing_notification_preferences
        WHERE user_id = $1
        ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function deleteNotificationPreferenceById(preferenceId: string, userId: string) {
    const result = await pool.query<NotificationPreferenceRecord>(
        `DELETE FROM listing_notification_preferences
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [preferenceId, userId]
    );

    return result.rows[0] ?? null;
}

export async function findNotificationRecipientsForListing(input: {
    listingOwnerUserId: string;
    listingName: string;
    listingDescription: string;
    listingCategories: string[];
}) {
    const result = await pool.query<NotificationRecipientRecord>(
        `SELECT DISTINCT u.id AS user_id, u.email
        FROM listing_notification_preferences p
        JOIN users u ON u.id = p.user_id
        WHERE u.is_email_verified = TRUE
          AND p.user_id <> $1
          AND (
            EXISTS (
                SELECT 1
                FROM unnest(p.categories) AS preference_category
                WHERE preference_category = ANY($4::TEXT[])
            )
            OR EXISTS (
                SELECT 1
                FROM unnest(p.keywords) AS keyword
                WHERE POSITION(keyword IN $2) > 0
                   OR POSITION(keyword IN $3) > 0
            )
          )`,
        [
            input.listingOwnerUserId,
            input.listingName,
            input.listingDescription,
            input.listingCategories
        ]
    );

    return result.rows;
}