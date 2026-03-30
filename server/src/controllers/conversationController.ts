import type { Request, Response } from 'express';
import {
    getOrCreateConversation,
    getConversationForUser,
    listConversationsForUser,
    sendMessageToConversation
} from '../services/conversationService';
import { HttpError } from '../utils/httpError';

function getUserId(req: Request) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    return req.user.id;
}

export async function createOrGetConversation(req: Request, res: Response) {
    const conversation = await getOrCreateConversation(getUserId(req), req.body);
    return res.status(200).json({ conversation });
}

export async function listConversations(req: Request, res: Response) {
    const conversations = await listConversationsForUser(getUserId(req));
    return res.status(200).json({ conversations });
}

export async function getConversation(req: Request, res: Response) {
    const conversation = await getConversationForUser(getUserId(req), req.params.conversationId);
    return res.status(200).json({ conversation });
}

export async function postMessage(req: Request, res: Response) {
    const message = await sendMessageToConversation(
        getUserId(req),
        req.params.conversationId,
        req.body
    );
    return res.status(201).json({ message });
}
