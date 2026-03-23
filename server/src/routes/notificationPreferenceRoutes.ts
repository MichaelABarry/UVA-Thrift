import { Router } from 'express';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    listNotificationPreferences
} from '../controllers/notificationPreferenceController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const notificationPreferenceRouter = Router();

notificationPreferenceRouter.use(asyncHandler(requireVerifiedEmail));
notificationPreferenceRouter.get('/', asyncHandler(listNotificationPreferences));
notificationPreferenceRouter.post('/', asyncHandler(createNotificationPreference));
notificationPreferenceRouter.delete('/:preferenceId', asyncHandler(deleteNotificationPreference));