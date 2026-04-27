import type { Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import {
    createListingForUser,
    deleteListingForUser,
    getAllListingsForUser,
    getListingById,
    getListingForUser,
    getListingsForUser,
    reportListingForUser,
    updateListingForUser,
	extendListingForUser
} from '../services/listingService';

function getUserId(req: Request) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    return req.user.id;
}

export async function createListing(req: Request, res: Response) {
    const listing = await createListingForUser(getUserId(req), req.body, req.file);
    return res.status(201).json({ listing });
}

export async function listListings(req: Request, res: Response) {
    const listings = await getAllListingsForUser(getUserId(req));
    return res.status(200).json({ listings });
}

export async function getListingDetails(req: Request, res: Response) {
    const listing = await getListingById(req.params.listingId, getUserId(req));
    return res.status(200).json({ listing });
}

export async function listMyListings(req: Request, res: Response) {
    const listings = await getListingsForUser(getUserId(req));
    return res.status(200).json({ listings });
}

export async function getMyListing(req: Request, res: Response) {
    const listing = await getListingForUser(getUserId(req), req.params.listingId);
    return res.status(200).json({ listing });
}

export async function updateMyListing(req: Request, res: Response) {
    const listing = await updateListingForUser(getUserId(req), req.params.listingId, req.body, req.file);
    return res.status(200).json({ listing });
}

export async function deleteMyListing(req: Request, res: Response) {
    await deleteListingForUser(getUserId(req), req.params.listingId);
    return res.status(204).send();
}

export async function toggleListingReport(req: Request, res: Response) {
    const status = await reportListingForUser(getUserId(req), req.params.listingId);
    return res.status(200).json(status);
}

export async function extendMyListing(req: Request, res: Response) {
    const extensionDays = Number(req.body.extensionDays);
    const listing = await extendListingForUser(getUserId(req), req.params.listingId, extensionDays);
    return res.status(200).json({ listing });
}
