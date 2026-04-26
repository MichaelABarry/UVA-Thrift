export function HoosReusePage() {
    return (
        <main className="page-content">
            <div className="page-container hoos-reuse-shell">

                {/* ── Hero ── */}
                <div className="hoos-reuse-hero">
                    <div className="hoos-reuse-hero-text">
                        <p className="hoos-reuse-eyebrow">UVA Sustainability Initiative</p>
                        <h1 className="hoos-reuse-title">Hoos ReUse</h1>
                        <p className="hoos-reuse-tagline">
                            Don't toss it. Donate it. Keep UVA green, one move-out at a time.
                        </p>
                    </div>
                    <div className="hoos-reuse-hero-badge">♻️</div>
                </div>

                {/* ── What is it ── */}
                <section className="hoos-reuse-section">
                    <h2 className="hoos-reuse-section-title">What is Hoos ReUse?</h2>
                    <p className="hoos-reuse-body">
                        The <strong>annual Hoos ReUse Move Out Donation Drive</strong> gives students living on
                        Grounds the opportunity to donate gently-used and excess items during move-out season
                        instead of throwing their items away. It's one of UVA's most impactful
                        sustainability programs, diverting thousands of pounds of usable goods every year.

						
                    </p>
                    <p className="hoos-reuse-body">
                        Donated items are collected, sorted, and redistributed to local nonprofits, student
                        organizations, and community members who need them most. Everything from furniture
                        and kitchenware to clothes and school supplies finds a new home.
                    </p>
                </section>

                {/* ── Stats cards ── */}
                <div className="hoos-reuse-stats">
                    <div className="hoos-reuse-stat-card">
                        <span className="hoos-reuse-stat-icon">🪑</span>
                        <p className="hoos-reuse-stat-label">Furniture, kitchenware &amp; more</p>
                    </div>
                    <div className="hoos-reuse-stat-card">
                        <span className="hoos-reuse-stat-icon">👕</span>
                        <p className="hoos-reuse-stat-label">Clothing &amp; textiles</p>
                    </div>
                    <div className="hoos-reuse-stat-card">
                        <span className="hoos-reuse-stat-icon">📚</span>
                        <p className="hoos-reuse-stat-label">Books &amp; school supplies</p>
                    </div>
                    <div className="hoos-reuse-stat-card">
                        <span className="hoos-reuse-stat-icon">📱</span>
                        <p className="hoos-reuse-stat-label">Electronics &amp; small appliances</p>
                    </div>
                </div>

                {/* ── Interested section ── */}
                <section className="hoos-reuse-callout">
                    <div className="hoos-reuse-callout-content">
                        <h3 className="hoos-reuse-callout-title">Couldn't sell it on UVA Thrift?</h3>
                        <p className="hoos-reuse-callout-body">
                            If your listing expires without a buyer, don't throw it away.
                            Donate it through Hoos ReUse instead. Every item kept out of the
                            trash makes a difference.
                        </p>
                        <p className="hoos-reuse-callout-body">
                            Visit the official Hoos ReUse page to find drop-off locations,
                            donation guidelines, and this year's move-out drive dates.
                        </p>
                        <a
                            href="https://sustainability.virginia.edu/hoos-reuse"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button-accent hoos-reuse-cta"
                        >
                            Visit the Official Hoos ReUse Site ↗
                        </a>
                    </div>
                </section>

            </div>
        </main>
    );
}
