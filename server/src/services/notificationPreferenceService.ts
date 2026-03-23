import { z } from 'zod';
import {
    createNotificationPreference,
    deleteNotificationPreferenceById,
    findNotificationPreferencesByUserId,
    findNotificationRecipientsForListing,
    type NotificationPreferenceRecord
} from '../db/queries/notificationPreferenceQueries';
import { HttpError } from '../utils/httpError';
import { sendListingNotificationEmail } from './emailService';

type ListingNotificationPayload = {
    id: string;
    name: string;
    description: string;
    price: number;
    categories: string[];
    imageUrl: string | null;
    createdAt: string;
    userId: string;
};

const notificationPreferenceSchema = z.object({
    keywords: z.preprocess(
        (value) => {
            if (typeof value === 'string') {
                return value.split(',').map((keyword) => keyword.trim());
            }

            return value;
        },
        z.array(z.string().trim().max(80)).default([])
    ),
    categories: z.preprocess(
        (value) => {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value) as string[];
                } catch {
                    return value.split(',').map((category) => category.trim());
                }
            }

            return value;
        },
        z.array(z.string().trim().max(40)).default([])
    )
}).superRefine((value, context) => {
    if (!value.keywords.some(Boolean) && !value.categories.some(Boolean)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Add at least one keyword or category.'
        });
    }
});

function normalizeValues(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function toNotificationPreferenceResponse(preference: NotificationPreferenceRecord) {
    return {
        id: preference.id,
        userId: preference.user_id,
        keywords: preference.keywords,
        categories: preference.categories,
        createdAt: preference.created_at,
        updatedAt: preference.updated_at
    };
}

export async function createNotificationPreferenceForUser(userId: string, input: unknown) {
    const parsed = notificationPreferenceSchema.parse(input);
    const preference = await createNotificationPreference({
        userId,
        keywords: normalizeValues(parsed.keywords),
        categories: normalizeValues(parsed.categories)
    });

    return toNotificationPreferenceResponse(preference);
}

export async function getNotificationPreferencesForUser(userId: string) {
    const preferences = await findNotificationPreferencesByUserId(userId);
    return preferences.map(toNotificationPreferenceResponse);
}

export async function deleteNotificationPreferenceForUser(userId: string, preferenceId: string) {
    const preference = await deleteNotificationPreferenceById(preferenceId, userId);

    if (!preference) {
        throw new HttpError('Notification preference not found.', 404);
    }
}

export async function notifyUsersAboutNewListing(listing: ListingNotificationPayload) {
    const recipients = await findNotificationRecipientsForListing({
        listingOwnerUserId: listing.userId,
        listingName: listing.name.toLowerCase(),
        listingDescription: listing.description.toLowerCase(),
        listingCategories: listing.categories.map((category) => category.toLowerCase())
    });

    if (!recipients.length) {
        return;
    }

    await Promise.allSettled(
        recipients.map((recipient) =>
            sendListingNotificationEmail({
                toEmail: recipient.email,
                listing
            })
        )
    );
}