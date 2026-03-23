CREATE TABLE IF NOT EXISTS listing_watch_subscriptions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_watch_subscriptions_listing_id
  ON listing_watch_subscriptions(listing_id);