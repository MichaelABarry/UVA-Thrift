import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';
import * as authService from '../services/authService';

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// AuthProvider component that wraps the application and provides authentication state and functions to its children. It manages the current user, loading state, and provides a function to refresh the user information from the server.
export function AuthProvider({ children }: { children: ReactNode }) {

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authService.getProfile();
            setUser(response.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    const value = useMemo(
        () => ({
            user,
            loading,
            refreshUser,
            setUser
        }),
        [user, loading, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to access the authentication context. It ensures that the hook is used within an AuthProvider and returns the authentication state and functions.
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider.');
    }
    return context;
}
