import { Link, useLocation } from 'react-router-dom';

type NavLink = {
    to: string;
    label: string;
    className?: string;
};

const LINKS: NavLink[] = [
    { to: '/home', label: 'Home' },
    { to: '/messages', label: 'Messages' },
    { to: '/profile', label: 'Profile' },
    { to: '/listings/new', label: '+ Add Item', className: 'nav-btn-add' }
];

export function TopNav() {
    const location = useLocation();

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
                </nav>
            </div>
        </header>
    );
}
