import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from '../components/ProtectedLayout';
import { AuthPage } from '../pages/AuthPage';
import { CreateListingPage } from '../pages/CreateListingPage';
import { HomePage } from '../pages/HomePage';
import { MyItemsPage } from '../pages/MyItemsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';

// Sets up the main application routing.
export function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route element={<ProtectedLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/my-items" element={<MyItemsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/listings/new" element={<CreateListingPage />} />
                <Route path="/listings/:listingId/edit" element={<CreateListingPage />} />
            </Route>

            {/* Catch-all route to redirect any unknown paths back to the login page. This ensures that users don't end up on a blank page if they navigate to an undefined route. */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
