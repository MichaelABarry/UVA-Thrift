import { sendListingExpiredEmail } from './emailService';
import {
    findExpiredUnnotifiedListings,
    markListingExpiryNotified,
    createSystemNotification,
} from '../db/queries/systemNotificationQueries';

const HOOS_REUSE_URL = 'https://sustainability.virginia.edu/hoos-reuse';
const CHECK_INTERVAL_MS = 1000 * 60*60*24; // 24 hours


// Check for newly expired listings and send email + in-app notification to each owner.
export async function notifyExpiredListings() {
    const expired = await findExpiredUnnotifiedListings();

    if (expired.length === 0) {
        console.log('[Expiration] No newly expired listings to notify.');
        return;
    }

    console.log(`[Expiration] Notifying ${expired.length} newly expired listing(s).`);

    for (const listing of expired) {
        try {
            // Send email
            await sendListingExpiredEmail(listing.user_email, {
                id: listing.id,
                name: listing.name,
            });

            // Create in-app system notification
            await createSystemNotification({
                userId: listing.user_id,
                title: `Your listing has expired: ${listing.name}`,
                body: `Your listing "${listing.name}" has expired and is no longer visible to other students. If it didn't sell, consider donating it through Hoos ReUse. Items go directly to Goodwill and the Charlottesville-Albemarle SPCA.`,
                link: HOOS_REUSE_URL,
            });

            // Mark as notified so we don't send again
            await markListingExpiryNotified(listing.id);

            console.log(`[Expiration] Notified user ${listing.user_email} about listing "${listing.name}".`);
        } catch (err) {
            // Log but don't crash — try the next listing
            console.error(`[Expiration] Failed to notify for listing ${listing.id}:`, err);
        }
    }
}

// Call this once when the server starts. It runs an immediate check then
// schedules a check every 24 hours.
export function startExpirationJob() {
    console.log('[Expiration] Starting daily expiration check job.');

    // Run immediately on startup to catch anything that expired while server was down
    void notifyExpiredListings().catch((err) => {
        console.error('[Expiration] Initial check failed:', err);
    });

    // Then repeat every 24 hours
    setInterval(() => {
        void notifyExpiredListings().catch((err) => {
            console.error('[Expiration] Scheduled check failed:', err);
        });
    }, CHECK_INTERVAL_MS);
}
