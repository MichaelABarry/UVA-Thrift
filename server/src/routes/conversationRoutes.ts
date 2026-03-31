import { Router } from 'express';
import {
    createOrGetConversation,
    getConversation,
    listConversations,
    postMessage
} from '../controllers/conversationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const conversationRouter = Router();

conversationRouter.use(asyncHandler(requireVerifiedEmail));
conversationRouter.post('/', asyncHandler(createOrGetConversation));
conversationRouter.get('/', asyncHandler(listConversations));
conversationRouter.get('/:conversationId', asyncHandler(getConversation));
conversationRouter.post('/:conversationId/messages', asyncHandler(postMessage));
