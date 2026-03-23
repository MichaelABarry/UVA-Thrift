import { z } from 'zod';
import {
    createListingWatch,
    deleteListingWatch,
    findListingWatch,
    findListingWatchRecipients,
    findWatchedListingsByUserId
} from '../db/queries/listingWatchQueries';
import { findListingById, type ListingRecord } from '../db/queries/listingQueries';
import { HttpError } from '../utils/httpError';
import { sendWatchedListingChangeEmail } from './emailService';

type ListingResponse = {
    id: string;
    userId: string;
    name: string;
    description: string;
    price: number;
    categories: string[];
    imageUrl: string | null;
    createdAt: string;
};

const listingWatchSchema = z.object({
    listingId: z.string().trim().min(1)
});

function toListingResponse(listing: ListingRecord): ListingResponse {
    return {
        id: listing.id,
        userId: listing.user_id,
        name: listing.name,
        description: listing.description,
        price: listing.price_cents / 100,
        categories: listing.categories,
        imageUrl: listing.image_url,
        createdAt: listing.created_at
    };
}

export async function getWatchedListingsForUser(userId: string) {
    const listings = await findWatchedListingsByUserId(userId);
    return listings.map(toListingResponse);
}

export async function createListingWatchForUser(userId: string, input: unknown) {
    const parsed = listingWatchSchema.parse(input);
    const listing = await findListingById(parsed.listingId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    if (listing.user_id === userId) {
        throw new HttpError('You cannot watch your own listing.', 400);
    }

    await createListingWatch(userId, parsed.listingId);
    return toListingResponse(listing);
}

export async function deleteListingWatchForUser(userId: string, listingId: string) {
    const watch = await deleteListingWatch(userId, listingId);

    if (!watch) {
        throw new HttpError('Listing watch not found.', 404);
    }
}

export async function getListingWatchStatusForUser(userId: string, listingId: string) {
    const watch = await findListingWatch(userId, listingId);
    return { isWatching: Boolean(watch) };
}

export async function notifyWatchersAboutListingChange(
    changeType: 'updated' | 'deleted',
    listing: ListingResponse,
    actorUserId?: string
) {
    const recipients = await findListingWatchRecipients(listing.id, actorUserId);

    if (!recipients.length) {
        return;
    }

    await Promise.allSettled(
        recipients.map((recipient) =>
            sendWatchedListingChangeEmail({
                toEmail: recipient.email,
                changeType,
                listing
            })
        )
    );
}