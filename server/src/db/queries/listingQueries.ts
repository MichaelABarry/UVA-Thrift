import { pool } from '../pool';

export type ListingRecord = {
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    created_at: string;
    updated_at: string;
};

export async function createListing(input: {
    userId: string;
    name: string;
    description: string;
    priceCents: number;
    categories: string[];
}) {
    const result = await pool.query<ListingRecord>(
        `INSERT INTO listings (user_id, name, description, price_cents, categories)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [input.userId, input.name, input.description, input.priceCents, input.categories]
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
}) {
    const result = await pool.query<ListingRecord>(
        `UPDATE listings
        SET name = $3,
            description = $4,
            price_cents = $5,
            categories = $6,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [input.listingId, input.userId, input.name, input.description, input.priceCents, input.categories]
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
