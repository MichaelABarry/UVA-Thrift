import { z } from 'zod';
import {
    createListing,
    deleteListingById,
    findAllListings,
    findListingByIdForUser,
    findListingsByUserId,
    type ListingRecord,
    updateListingById
} from '../db/queries/listingQueries';
import { deleteListingImage, uploadListingImage } from './storageService';
import { HttpError } from '../utils/httpError';

const listingSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    price: z.coerce.number().finite().nonnegative().max(100000),
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
        imageUrl: listing.image_url,
        createdAt: listing.created_at
    };
}

export async function createListingForUser(userId: string, input: unknown, file?: Express.Multer.File) {
    const parsed = listingSchema.parse(input);
    const normalizedCategories = normalizeCategories(parsed.categories);
    const uploadedImage = file ? await uploadListingImage(file) : null;

    try {
        const listing = await createListing({
            userId,
            name: parsed.name,
            description: parsed.description,
            priceCents: Math.round(parsed.price * 100),
            categories: normalizedCategories,
            imageUrl: uploadedImage?.imageUrl ?? null,
            imageKey: uploadedImage?.imageKey ?? null
        });

        return toListingResponse(listing);
    } catch (error) {
        if (uploadedImage?.imageKey) {
            await deleteListingImage(uploadedImage.imageKey);
        }

        throw error;
    }
}

export async function getAllListings() {
    const listings = await findAllListings();

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
            imageUrl: uploadedImage?.imageUrl ?? existingListing.image_url,
            imageKey: uploadedImage?.imageKey ?? existingListing.image_key
        });

        if (!listing) {
            throw new HttpError('Listing not found.', 404);
        }

        if (uploadedImage?.imageKey && existingListing.image_key) {
            await deleteListingImage(existingListing.image_key);
        }

        return toListingResponse(listing);
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

    await deleteListingImage(listing.image_key);
}
