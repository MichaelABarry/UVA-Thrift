import type { Request, Response } from 'express';
import {
    createListingWatchForUser,
    deleteListingWatchForUser,
    getListingWatchStatusForUser,
    getWatchedListingsForUser
} from '../services/listingWatchService';
import { HttpError } from '../utils/httpError';

function getUserId(req: Request) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    return req.user.id;
}

export async function listWatchedListings(req: Request, res: Response) {
    const listings = await getWatchedListingsForUser(getUserId(req));
    return res.status(200).json({ listings });
}

export async function createListingWatch(req: Request, res: Response) {
    const listing = await createListingWatchForUser(getUserId(req), req.body);
    return res.status(201).json({ listing });
}

export async function deleteListingWatch(req: Request, res: Response) {
    await deleteListingWatchForUser(getUserId(req), req.params.listingId);
    return res.status(204).send();
}

export async function getListingWatchStatus(req: Request, res: Response) {
    const status = await getListingWatchStatusForUser(getUserId(req), req.params.listingId);
    return res.status(200).json(status);
}