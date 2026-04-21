import { pool } from '../pool';

export type ListingRecord = {
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    condition: string;
    image_url: string | null;
    image_key: string | null;
    created_at: string;
    updated_at: string;
	expires_at: string;
};

export async function createListing(input: {
    userId: string;
    name: string;
    description: string;
    priceCents: number;
    categories: string[];
    condition: string;
    imageUrl: string | null;
    imageKey: string | null;
	expiresAt: Date;
}) {
    const result = await pool.query<ListingRecord>(
        `INSERT INTO listings (user_id, name, description, price_cents, categories, condition, image_url, image_key, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [input.userId, input.name, input.description, input.priceCents, input.categories, input.condition, input.imageUrl, input.imageKey, input.expiresAt]
    );

    return result.rows[0];
}

export async function findAllListings() {
    const result = await pool.query<ListingRecord>(
        `SELECT * FROM listings
        ORDER BY created_at DESC`
    );

    return result.rows;
}

export async function findListingById(listingId: string) {
    const result = await pool.query<ListingRecord>(
        `SELECT * FROM listings
        WHERE id = $1`,
        [listingId]
    );

    return result.rows[0] ?? null;
}

export async function findListingByIdForUser(listingId: string, userId: string) {
    const result = await pool.query<ListingRecord>(
        `SELECT * FROM listings
        WHERE id = $1 AND user_id = $2`,
        [listingId, userId]
    );

    return result.rows[0] ?? null;
}

export async function findListingsByUserId(userId: string) {
    const result = await pool.query<ListingRecord>(
        `SELECT * FROM listings
        WHERE user_id = $1
        ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function updateListingById(input: {
    listingId: string;
    userId: string;
    name: string;
    description: string;
    priceCents: number;
    categories: string[];
    condition: string;
    imageUrl: string | null;
    imageKey: string | null;
}) {
    const result = await pool.query<ListingRecord>(
        `UPDATE listings
        SET name = $3,
            description = $4,
            price_cents = $5,
            categories = $6,
            condition = $7,
            image_url = $8,
            image_key = $9,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [
            input.listingId,
            input.userId,
            input.name,
            input.description,
            input.priceCents,
            input.categories,
            input.condition,
            input.imageUrl,
            input.imageKey
        ]
    );

    return result.rows[0] ?? null;
}

export async function deleteListingById(listingId: string, userId: string) {
    const result = await pool.query<ListingRecord>(
        `DELETE FROM listings
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [listingId, userId]
    );

    return result.rows[0] ?? null;
}
