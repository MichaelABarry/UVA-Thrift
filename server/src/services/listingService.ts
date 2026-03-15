import { z } from 'zod';
import {
    createListing,
    deleteListingById,
    findAllListings,
    findListingByIdForUser,
    findListingsByUserId,
    updateListingById
} from '../db/queries/listingQueries';
import { HttpError } from '../utils/httpError';

const listingSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    price: z.number().finite().nonnegative().max(100000),
    categories: z.array(z.string().trim().min(1).max(40)).min(1).max(12)
});

function normalizeCategories(categories: string[]) {
    return Array.from(new Set(categories.map((category) => category.toLowerCase())));
}

function toListingResponse(listing: {
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    created_at: string;
}) {
    return {
        id: listing.id,
        userId: listing.user_id,
        name: listing.name,
        description: listing.description,
        price: listing.price_cents / 100,
        categories: listing.categories,
        createdAt: listing.created_at
    };
}

export async function createListingForUser(userId: string, input: unknown) {
    const parsed = listingSchema.parse(input);
    const normalizedCategories = normalizeCategories(parsed.categories);

    const listing = await createListing({
        userId,
        name: parsed.name,
        description: parsed.description,
        priceCents: Math.round(parsed.price * 100),
        categories: normalizedCategories
    });

    return toListingResponse(listing);
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

export async function updateListingForUser(userId: string, listingId: string, input: unknown) {
    const parsed = listingSchema.parse(input);
    const normalizedCategories = normalizeCategories(parsed.categories);

    const listing = await updateListingById({
        listingId,
        userId,
        name: parsed.name,
        description: parsed.description,
        priceCents: Math.round(parsed.price * 100),
        categories: normalizedCategories
    });

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    return toListingResponse(listing);
}

export async function deleteListingForUser(userId: string, listingId: string) {
    const listing = await deleteListingById(listingId, userId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }
}
