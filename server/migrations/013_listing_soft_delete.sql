ALTER TABLE listings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listings_deleted_at ON listings(deleted_at);