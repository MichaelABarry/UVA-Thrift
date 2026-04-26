import type { PoolClient } from 'pg';
import { pool } from '../pool';
import type { ListingRecord } from './listingQueries';

export type ListingReportResult = {
    alreadyReported: boolean;
    listingDeleted: boolean;
    deletedListing: ListingRecord | null;
};

type ListingReportRecord = {
    user_id: string;
    listing_id: string;
    created_at: string;
};

type CountRow = {
    report_count: string;
};

async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function createListingReport(userId: string, listingId: string) {
    return withTransaction<ListingReportResult | null>(async (client) => {
        const listingResult = await client.query<ListingRecord>(
            `SELECT * FROM listings
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE`,
            [listingId]
        );

        const listing = listingResult.rows[0] ?? null;

        if (!listing) {
            return null;
        }

        const existingReportResult = await client.query<ListingReportRecord>(
            `SELECT * FROM listing_reports
            WHERE user_id = $1 AND listing_id = $2`,
            [userId, listingId]
        );

        if (existingReportResult.rows[0]) {
            return {
                alreadyReported: true,
                listingDeleted: false,
                deletedListing: null
            };
        }

        await client.query<ListingReportRecord>(
            `INSERT INTO listing_reports (user_id, listing_id)
            VALUES ($1, $2)`,
            [userId, listingId]
        );

        const countResult = await client.query<CountRow>(
            `SELECT COUNT(*)::text AS report_count
            FROM listing_reports
            WHERE listing_id = $1`,
            [listingId]
        );

        const reportCount = Number(countResult.rows[0]?.report_count ?? '0');

        if (reportCount < 3) {
            return {
                alreadyReported: false,
                listingDeleted: false,
                deletedListing: null
            };
        }

        const deletedListingResult = await client.query<ListingRecord>(
            `UPDATE listings
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
              AND deleted_at IS NULL
            RETURNING *`,
            [listingId]
        );

        return {
            alreadyReported: false,
            listingDeleted: true,
            deletedListing: deletedListingResult.rows[0] ?? null
        };
    });
}