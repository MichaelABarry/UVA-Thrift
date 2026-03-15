export type Listing = {
    id: string;
    userId: string;
    name: string;
    description: string;
    price: number;
    categories: string[];
    createdAt: string;
};

export type CreateListingPayload = {
    name: string;
    description: string;
    price: number;
    categories: string[];
};

export type UpdateListingPayload = CreateListingPayload;
