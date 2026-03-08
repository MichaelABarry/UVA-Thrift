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
