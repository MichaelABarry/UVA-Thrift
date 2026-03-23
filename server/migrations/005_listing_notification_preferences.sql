CREATE TABLE IF NOT EXISTS listing_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    COALESCE(array_length(keywords, 1), 0) > 0
    OR COALESCE(array_length(categories, 1), 0) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_listing_notification_preferences_user_id
  ON listing_notification_preferences(user_id);