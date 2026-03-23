import { Router } from 'express';
import {
    createListingWatch,
    deleteListingWatch,
    getListingWatchStatus,
    listWatchedListings
} from '../controllers/listingWatchController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const listingWatchRouter = Router();

listingWatchRouter.use(asyncHandler(requireVerifiedEmail));
listingWatchRouter.get('/', asyncHandler(listWatchedListings));
listingWatchRouter.post('/', asyncHandler(createListingWatch));
listingWatchRouter.get('/:listingId', asyncHandler(getListingWatchStatus));
listingWatchRouter.delete('/:listingId', asyncHandler(deleteListingWatch));