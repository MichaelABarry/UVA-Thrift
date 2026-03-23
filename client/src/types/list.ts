import type { Listing } from './listing';

export type ItemList = {
    id: string;
    userId: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    items: Listing[];
};

export type CreateListPayload = {
    name: string;
    description: string;
};

export type UpdateListPayload = CreateListPayload;