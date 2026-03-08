import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/authService';

type NavLink = {
    to: string;
    label: string;
    className?: string;
};

const LINKS: NavLink[] = [
    { to: '/home', label: 'Home' },
    { to: '/profile', label: 'Profile' },
    { to: '/listings/new', label: '+ Add Item', className: 'nav-btn-add' }
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
                <Link to="/home" className="top-nav-brand">
                    UVA&nbsp;<span className="top-nav-brand-accent">Thrift</span>
                </Link>
                <nav className="top-nav-links">
                    {LINKS.map((link) => {
                        const isActive = location.pathname === link.to;
                        const extra = link.className ?? '';
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`button nav-link ${extra} ${isActive ? 'nav-link-active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <button className="button nav-btn-logout" type="button" onClick={handleLogout}>
                        Log Out
                    </button>
                </nav>
            </div>
        </header>
    );
}
