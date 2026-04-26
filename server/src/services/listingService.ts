import { z } from 'zod';
import {
    createListing,
    deleteListingById,
    findAllListings,
    findListingById,
    findListingByIdForUser,
    findListingsByUserId,
    type ListingRecord,
    updateListingById
} from '../db/queries/listingQueries';
import { createListingReport } from '../db/queries/listingReportQueries';
import { deleteListingImage, uploadListingImage } from './storageService';
import { HttpError } from '../utils/httpError';
import { notifyUsersAboutNewListing } from './notificationPreferenceService';
import { notifyWatchersAboutListingChange } from './listingWatchService';

const listingSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional().default(''),
    price: z.coerce.number().finite().nonnegative().max(100000),
    condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']),
	expirationDays: z.coerce.number().int().min(1).max(365).optional().default(30),
    categories: z.preprocess(
        (value) => {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value) as string[];
                } catch {
                    return value
                        .split(',')
                        .map((category) => category.trim())
                        .filter(Boolean);
                }
            }

            return value;
        },
        z.array(z.string().trim().min(1).max(40)).min(1).max(12)
    )
});

function normalizeCategories(categories: string[]) {
    return Array.from(new Set(categories.map((category) => category.toLowerCase())));
}

function toListingResponse(listing: ListingRecord) {
    return {
        id: listing.id,
        userId: listing.user_id,
        name: listing.name,
        description: listing.description,
        price: listing.price_cents / 100,
        categories: listing.categories,
        condition: listing.condition,
        imageUrl: listing.image_url,
        createdAt: listing.created_at,
		expiresAt: listing.expires_at,
        isReported: Boolean(listing.is_reported)
    };
}

export async function createListingForUser(userId: string, input: unknown, file?: Express.Multer.File) {
    const parsed = listingSchema.parse(input);
    const normalizedCategories = normalizeCategories(parsed.categories);
    const uploadedImage = file ? await uploadListingImage(file) : null;

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + (parsed.expirationDays ?? 30));

    try {
        const listing = await createListing({
            userId,
            name: parsed.name,
            description: parsed.description,
            priceCents: Math.round(parsed.price * 100),
            categories: normalizedCategories,
            condition: parsed.condition,
            imageUrl: uploadedImage?.imageUrl ?? null,
            imageKey: uploadedImage?.imageKey ?? null,
			expiresAt
        });

        const response = toListingResponse(listing);

        try {
            await notifyUsersAboutNewListing(response);
        } catch (error) {
            console.error('Unable to send listing notification emails:', error);
        }

        return response;
    } catch (error) {
        if (uploadedImage?.imageKey) {
            await deleteListingImage(uploadedImage.imageKey);
        }

        throw error;
    }
}

export async function getListingById(listingId: string, userId: string) {
    const listing = await findListingById(listingId, userId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    return toListingResponse(listing);
}

export async function getAllListingsForUser(userId: string) {
    const listings = await findAllListings(userId);

    return listings.map(toListingResponse);
}

export async function getListingForUser(userId: string, listingId: string) {
    const listing = await findListingByIdForUser(listingId, userId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    return toListingResponse(listing);
}

export async function getListingsForUser(userId: string) {
    const listings = await findListingsByUserId(userId);
    return listings.map(toListingResponse);
}

export async function updateListingForUser(userId: string, listingId: string, input: unknown, file?: Express.Multer.File) {
    const parsed = listingSchema.parse(input);
    const normalizedCategories = normalizeCategories(parsed.categories);
    const existingListing = await findListingByIdForUser(listingId, userId);

    if (!existingListing) {
        throw new HttpError('Listing not found.', 404);
    }

    const uploadedImage = file ? await uploadListingImage(file) : null;

    try {
        const listing = await updateListingById({
            listingId,
            userId,
            name: parsed.name,
            description: parsed.description,
            priceCents: Math.round(parsed.price * 100),
            categories: normalizedCategories,
            condition: parsed.condition,
            imageUrl: uploadedImage?.imageUrl ?? existingListing.image_url,
            imageKey: uploadedImage?.imageKey ?? existingListing.image_key
        });

        if (!listing) {
            throw new HttpError('Listing not found.', 404);
        }

        if (uploadedImage?.imageKey && existingListing.image_key) {
            await deleteListingImage(existingListing.image_key);
        }

        const response = toListingResponse(listing);

        try {
            await notifyWatchersAboutListingChange('updated', response, userId);
        } catch (error) {
            console.error('Unable to send watched listing update emails:', error);
        }

        return response;
    } catch (error) {
        if (uploadedImage?.imageKey) {
            await deleteListingImage(uploadedImage.imageKey);
        }

        throw error;
    }
}

export async function deleteListingForUser(userId: string, listingId: string) {
    const listing = await deleteListingById(listingId, userId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    try {
        await notifyWatchersAboutListingChange('deleted', toListingResponse(listing), userId);
    } catch (error) {
        console.error('Unable to send watched listing delete emails:', error);
    }

    await deleteListingImage(listing.image_key);
}

export async function reportListingForUser(userId: string, listingId: string) {
    const listing = await findListingById(listingId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    if (listing.user_id === userId) {
        throw new HttpError('You cannot report your own listing.', 400);
    }

    const result = await createListingReport(userId, listingId);

    if (!result) {
        throw new HttpError('Listing not found.', 404);
    }

    if (result.alreadyReported) {
        return {
            listingDeleted: false
        };
    }

    if (result.listingDeleted && result.deletedListing) {
        try {
            await notifyWatchersAboutListingChange('deleted', toListingResponse(result.deletedListing), userId);
        } catch (error) {
            console.error('Unable to send watched listing delete emails after report threshold:', error);
        }

        await deleteListingImage(result.deletedListing.image_key);
    }

    return {
        listingDeleted: result.listingDeleted
    };
}
