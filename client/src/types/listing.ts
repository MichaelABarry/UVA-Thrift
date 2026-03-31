export type Listing = {
    id: string;
    userId: string;
    name: string;
    description: string;
    price: number;
    categories: string[];
    condition: string;
    imageUrl: string | null;
    createdAt: string;
};

export type CreateListingPayload = {
    name: string;
    description: string;
    price: number;
    categories: string[];
    condition: string;
    image?: File | null;
};

export type UpdateListingPayload = CreateListingPayload;
