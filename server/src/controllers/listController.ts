import type { Request, Response } from 'express';
import {
    addItemToListForUser,
    createListForUser,
    deleteListForUser,
    getListForUser,
    getListsForUser,
    removeItemFromListForUser,
    updateListForUser
} from '../services/listService';
import { HttpError } from '../utils/httpError';

function getUserId(req: Request) {
    if (!req.user?.id) {
        throw new HttpError('Unauthorized.', 401);
    }

    return req.user.id;
}

export async function createList(req: Request, res: Response) {
    const list = await createListForUser(getUserId(req), req.body);
    return res.status(201).json({ list });
}

export async function listLists(req: Request, res: Response) {
    const lists = await getListsForUser(getUserId(req));
    return res.status(200).json({ lists });
}

export async function getList(req: Request, res: Response) {
    const list = await getListForUser(getUserId(req), req.params.listId);
    return res.status(200).json({ list });
}

export async function updateList(req: Request, res: Response) {
    const list = await updateListForUser(getUserId(req), req.params.listId, req.body);
    return res.status(200).json({ list });
}

export async function deleteList(req: Request, res: Response) {
    await deleteListForUser(getUserId(req), req.params.listId);
    return res.status(204).send();
}

export async function addListItem(req: Request, res: Response) {
    const list = await addItemToListForUser(getUserId(req), req.params.listId, req.body);
    return res.status(200).json({ list });
}

export async function removeListItem(req: Request, res: Response) {
    const list = await removeItemFromListForUser(getUserId(req), req.params.listId, req.params.listingId);
    return res.status(200).json({ list });
}