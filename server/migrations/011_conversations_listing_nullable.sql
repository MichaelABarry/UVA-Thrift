ALTER TABLE conversations DROP CONSTRAINT conversations_listing_id_fkey;
ALTER TABLE conversations ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE conversations ADD CONSTRAINT conversations_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
