import type { Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import {
    findSystemNotificationsByUserId,
    markSystemNotificationRead,
    markAllSystemNotificationsRead,
} from '../db/queries/systemNotificationQueries';

// GET /api/system-notifications — get all notifications for the logged-in user.
export async function listSystemNotifications(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError('Unauthorized.', 401);

    const notifications = await findSystemNotificationsByUserId(req.user.id);
    return res.status(200).json({ notifications });
}

// PATCH /api/system-notifications/:notificationId/read — mark one as read.
export async function readSystemNotification(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError('Unauthorized.', 401);

    const notification = await markSystemNotificationRead(
        req.params.notificationId,
        req.user.id
    );

    if (!notification) {
        throw new HttpError('Notification not found.', 404);
    }

    return res.status(200).json({ notification });
}

// PATCH /api/system-notifications/read-all — mark all as read.
export async function readAllSystemNotifications(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError('Unauthorized.', 401);

    await markAllSystemNotificationsRead(req.user.id);
    return res.status(204).send();
}
