import { Router } from 'express';
import { createListing } from '../controllers/listingController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const listingRouter = Router();

listingRouter.post('/', asyncHandler(requireVerifiedEmail), asyncHandler(createListing));
