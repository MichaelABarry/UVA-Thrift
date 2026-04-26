import { Router } from 'express';
import {
	createListing,
	deleteMyListing,
	getListingDetails,
	getMyListing,
	listListings,
	listMyListings,
	toggleListingReport,
	updateMyListing
} from '../controllers/listingController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';
import { uploadListingImage } from '../middleware/listingUploadMiddleware';

export const listingRouter = Router();

listingRouter.post('/', asyncHandler(requireVerifiedEmail), uploadListingImage, asyncHandler(createListing));
listingRouter.get('/', asyncHandler(requireVerifiedEmail), asyncHandler(listListings));
listingRouter.get('/mine', asyncHandler(requireVerifiedEmail), asyncHandler(listMyListings));
listingRouter.get('/details/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(getListingDetails));
listingRouter.put('/:listingId/report', asyncHandler(requireVerifiedEmail), asyncHandler(toggleListingReport));
listingRouter.get('/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(getMyListing));
listingRouter.put('/:listingId', asyncHandler(requireVerifiedEmail), uploadListingImage, asyncHandler(updateMyListing));
listingRouter.delete('/:listingId', asyncHandler(requireVerifiedEmail), asyncHandler(deleteMyListing));
