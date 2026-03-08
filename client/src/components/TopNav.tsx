import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/authService';

type NavLink = {
    to: string;
    label: string;
};

const LINKS: NavLink[] = [
    { to: '/home', label: 'Home' },
    { to: '/listings/new', label: '+ Add Item' },
    { to: '/profile', label: 'Profile' }
];

export function TopNav() {
    const location = useLocation();
    const { setUser } = useAuth();

    async function handleLogout() {
        await logout();
        setUser(null);
    }

    return (
        <header className="top-nav" aria-label="Top navigation">
            <div className="top-nav-inner">
                <p className="top-nav-brand">UVA Thrift</p>
                <nav className="top-nav-links">
                    {LINKS.map((link) => {
                        const isActive = location.pathname === link.to;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`button button-secondary nav-link ${isActive ? 'nav-link-active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <button className="button" type="button" onClick={handleLogout}>
                        Log Out
                    </button>
                </nav>
            </div>
        </header>
    );
}
