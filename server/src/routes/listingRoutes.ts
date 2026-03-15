import { Router } from 'express';
import {
	createListing,
	deleteMyListing,
	getMyListing,
	listListings,
	listMyListings,
	updateMyListing
} from '../controllers/listingController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const listingRouter = Router();

listingRouter.post('/', asyncHandler(requireVerifiedEmail), asyncHandler(createListing));
listingRouter.get('/', asyncHandler(requireVerifiedEmail), asyncHandler(listListings));
listingRouter.get('/mine', asyncHandler(requireVerifiedEmail), asyncHandler(listMyListings));
listingRouter.get('/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(getMyListing));
listingRouter.put('/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(updateMyListing));
listingRouter.delete('/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(deleteMyListing));
