export type User = {
  id: string;
  email: string;
  isEmailVerified: boolean;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
};
