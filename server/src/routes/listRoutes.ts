import { Router } from 'express';
import {
    addListItem,
    createList,
    deleteList,
    getList,
    listLists,
    removeListItem,
    updateList
} from '../controllers/listController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const listRouter = Router();

listRouter.use(asyncHandler(requireVerifiedEmail));

listRouter.post('/', asyncHandler(createList));
listRouter.get('/', asyncHandler(listLists));
listRouter.get('/:listId', asyncHandler(getList));
listRouter.put('/:listId', asyncHandler(updateList));
listRouter.delete('/:listId', asyncHandler(deleteList));
listRouter.post('/:listId/items', asyncHandler(addListItem));
listRouter.delete('/:listId/items/:listingId', asyncHandler(removeListItem));