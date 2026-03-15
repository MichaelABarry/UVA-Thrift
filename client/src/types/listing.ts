export type Listing = {
    id: string;
    userId: string;
    name: string;
    description: string;
    price: number;
    categories: string[];
    imageUrl: string | null;
    createdAt: string;
};

export type CreateListingPayload = {
    name: string;
    description: string;
    price: number;
    categories: string[];
    image?: File | null;
};

export type UpdateListingPayload = CreateListingPayload;
