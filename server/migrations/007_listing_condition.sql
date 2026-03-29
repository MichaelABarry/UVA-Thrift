ALTER TABLE listings
ADD COLUMN condition TEXT NOT NULL DEFAULT 'good'
  CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor'));
