export type User = {
    id: string;
    email: string;
    isEmailVerified: boolean;
    displayName: string | null;
    phoneNumber: string | null;
    venmoUsername: string | null;
};

export type AuthState = {
    user: User | null;
    loading: boolean;
};
