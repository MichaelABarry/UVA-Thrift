import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyListings } from '../services/listingService';

function getDaysUntilExpiry(expiresAt: string): number {
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function TopNav() {
    const location = useLocation();
    const { user } = useAuth();
    const [expiredCount, setExpiredCount] = useState(0);

    // Check for expired listings whenever the user is logged in.
    // Re-runs when the route changes so the badge stays fresh as they navigate.
    useEffect(() => {
        if (!user?.isEmailVerified) {
            setExpiredCount(0);
            return;
        }

        getMyListings()
            .then((response) => {
                const count = response.listings.filter(
                    (l) => l.expiresAt && getDaysUntilExpiry(l.expiresAt) <= 0
                ).length;
                setExpiredCount(count);
            })
            .catch(() => {
                // Silently ignore — badge just won't show
            });
    }, [user?.isEmailVerified, location.pathname]);

    const navLinks = [
        { to: '/home', label: 'Home' },
        { to: '/messages', label: 'Messages' },
        { to: '/profile', label: 'Profile', badge: expiredCount > 0 ? expiredCount : null },
        { to: '/hoos-reuse', label: 'HoosReUse' },
        { to: '/listings/new', label: '+ New Item', className: 'nav-btn-add' }
    ];

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
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to;
                        const extra = link.className ?? '';
                        return (
                            <Link
                                key={link.to}
                                to={link.to === '/profile' ? '/profile?section=items' : link.to}
                                className={`nav-link ${extra} ${isActive && !extra ? 'nav-link-active' : ''}`}
                            >
                                {link.label}
								{'badge' in link && link.badge ? (
                                    <span className="nav-expiry-badge" aria-label={`${link.badge} expired listing${link.badge === 1 ? '' : 's'}`}>
                                        {link.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
