import type { Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import { createListingForUser } from '../services/listingService';

export async function createListing(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    const listing = await createListingForUser(req.user.id, req.body);
    return res.status(201).json({ listing });
}
