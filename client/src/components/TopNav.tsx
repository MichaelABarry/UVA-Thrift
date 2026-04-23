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
    { to: '/hoos-reuse', label: 'HoosReUse' },
    { to: '/listings/new', label: '+ New Item', className: 'nav-btn-add' }
];

export function TopNav() {
    const location = useLocation();

    return (
        <header className="top-nav" aria-label="Top navigation">
            <div className="top-nav-inner">
                <Link to="/home" className="top-nav-brand">
                    <img
                        src="/UVAThrift-favicon.jpg"
                        alt=""
                        aria-hidden="true"
                        className="top-nav-brand-icon"
                    />
                    <span>
                        UVA&nbsp;<span className="top-nav-brand-accent">Thrift</span>
                    </span>
                </Link>
                <nav className="top-nav-links">
                    {LINKS.map((link) => {
                        const isActive = location.pathname === link.to;
                        const extra = link.className ?? '';
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`nav-link ${extra} ${isActive && !extra ? 'nav-link-active' : ''}`}
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
