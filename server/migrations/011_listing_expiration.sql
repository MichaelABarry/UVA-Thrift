ALTER TABLE listings
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days';


CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
