import type { Request, Response } from 'express';
import {
    createNotificationPreferenceForUser,
    deleteNotificationPreferenceForUser,
    getNotificationPreferencesForUser
} from '../services/notificationPreferenceService';
import { HttpError } from '../utils/httpError';

function getUserId(req: Request) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    return req.user.id;
}

export async function createNotificationPreference(req: Request, res: Response) {
    const preference = await createNotificationPreferenceForUser(getUserId(req), req.body);
    return res.status(201).json({ preference });
}

export async function listNotificationPreferences(req: Request, res: Response) {
    const preferences = await getNotificationPreferencesForUser(getUserId(req));
    return res.status(200).json({ preferences });
}

export async function deleteNotificationPreference(req: Request, res: Response) {
    await deleteNotificationPreferenceForUser(getUserId(req), req.params.preferenceId);
    return res.status(204).send();
}