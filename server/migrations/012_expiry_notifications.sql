ALTER TABLE listings
ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS system_notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL,
    link        TEXT,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_user_id
    ON system_notifications(user_id);
