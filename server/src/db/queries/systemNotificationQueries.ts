import { pool } from '../pool';

export type SystemNotificationRecord = {
    id: string;
    user_id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
};

// create a new system notification for a user.
export async function createSystemNotification(input: {
    userId: string;
    title: string;
    body: string;
    link?: string;
}): Promise<SystemNotificationRecord> {
    const result = await pool.query<SystemNotificationRecord>(
        `INSERT INTO system_notifications (user_id, title, body, link)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [input.userId, input.title, input.body, input.link ?? null]
    );
    return result.rows[0];
}

// get all system notifications for a user, newest first.
export async function findSystemNotificationsByUserId(
    userId: string
): Promise<SystemNotificationRecord[]> {
    const result = await pool.query<SystemNotificationRecord>(
        `SELECT * FROM system_notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
    );
    return result.rows;
}

// mark a single notification as read.
export async function markSystemNotificationRead(
    notificationId: string,
    userId: string
): Promise<SystemNotificationRecord | null> {
    const result = await pool.query<SystemNotificationRecord>(
        `UPDATE system_notifications
         SET read_at = NOW()
         WHERE id = $1 AND user_id = $2 AND read_at IS NULL
         RETURNING *`,
        [notificationId, userId]
    );
    return result.rows[0] ?? null;
}

// mark all notifications for a user as read.
export async function markAllSystemNotificationsRead(userId: string): Promise<void> {
    await pool.query(
        `UPDATE system_notifications
         SET read_at = NOW()
         WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
    );
}

// Find all listings that have expired and haven't been notified yet.
// Joins with users so we get the owner's email in one query.
export async function findExpiredUnnotifiedListings() {
    const result = await pool.query<{
        id: string;
        user_id: string;
        name: string;
        user_email: string;
    }>(
        `SELECT l.id, l.user_id, l.name, u.email AS user_email
         FROM listings l
         JOIN users u ON u.id = l.user_id
         WHERE l.expires_at <= NOW()
           AND l.expiry_notified_at IS NULL
           AND l.deleted_at IS NULL`
    );
    return result.rows;
}

// mark a listing as having had its expiry notification sent.
export async function markListingExpiryNotified(listingId: string): Promise<void> {
    await pool.query(
        `UPDATE listings SET expiry_notified_at = NOW() WHERE id = $1`,
        [listingId]
    );
}
