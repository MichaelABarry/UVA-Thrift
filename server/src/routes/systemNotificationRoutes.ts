import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';
import {
    listSystemNotifications,
    readSystemNotification,
    readAllSystemNotifications,
} from '../controllers/systemNotificationController';

export const systemNotificationRouter = Router();

systemNotificationRouter.use(asyncHandler(requireVerifiedEmail));

systemNotificationRouter.get('/', asyncHandler(listSystemNotifications));
systemNotificationRouter.patch('/read-all', asyncHandler(readAllSystemNotifications));
systemNotificationRouter.patch('/:notificationId/read', asyncHandler(readSystemNotification));
