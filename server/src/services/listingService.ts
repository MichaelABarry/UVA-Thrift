import { z } from 'zod';
import { createListing } from '../db/queries/listingQueries';

const createListingSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    price: z.number().finite().nonnegative().max(100000),
    categories: z.array(z.string().trim().min(1).max(40)).min(1).max(12)
});

export async function createListingForUser(userId: string, input: unknown) {
    const parsed = createListingSchema.parse(input);

    const normalizedCategories = Array.from(
        new Set(parsed.categories.map((category) => category.toLowerCase()))
    );

    const listing = await createListing({
        userId,
        name: parsed.name,
        description: parsed.description,
        priceCents: Math.round(parsed.price * 100),
        categories: normalizedCategories
    });

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
