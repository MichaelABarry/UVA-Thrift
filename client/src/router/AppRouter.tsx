import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';

// Sets up the main application routing.
export function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Catch-all route to redirect any unknown paths back to the login page. This ensures that users don't end up on a blank page if they navigate to an undefined route. */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
