import type { Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import {
    createListingForUser,
    deleteListingForUser,
    getAllListings,
    getListingForUser,
    getListingsForUser,
    updateListingForUser
} from '../services/listingService';

export async function createListing(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    const listing = await createListingForUser(req.user.id, req.body);
    return res.status(201).json({ listing });
}

export async function listListings(_req: Request, res: Response) {
    const listings = await getAllListings();
    return res.status(200).json({ listings });
}

export async function listMyListings(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    const listings = await getListingsForUser(req.user.id);
    return res.status(200).json({ listings });
}

export async function getMyListing(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    const listing = await getListingForUser(req.user.id, req.params.listingId);
    return res.status(200).json({ listing });
}

export async function updateMyListing(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    const listing = await updateListingForUser(req.user.id, req.params.listingId, req.body);
    return res.status(200).json({ listing });
}

export async function deleteMyListing(req: Request, res: Response) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    await deleteListingForUser(req.user.id, req.params.listingId);
    return res.status(204).send();
}
