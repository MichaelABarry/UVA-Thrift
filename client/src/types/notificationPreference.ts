export type NotificationPreference = {
    id: string;
    userId: string;
    keywords: string[];
    categories: string[];
    createdAt: string;
    updatedAt: string;
};

export type CreateNotificationPreferencePayload = {
    keywords: string[];
    categories: string[];
};