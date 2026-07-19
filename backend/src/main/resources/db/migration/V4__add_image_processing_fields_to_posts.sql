-- V4: Add image processing fields to posts table

-- 1. Create the processing_status enum type
CREATE TYPE processing_status AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- 2. Add processed_image_key column (nullable — populated by background worker)
ALTER TABLE posts ADD COLUMN processed_image_key VARCHAR(255);

-- 3. Add thumbnail_key column (nullable — populated by background worker)
ALTER TABLE posts ADD COLUMN thumbnail_key VARCHAR(255);

-- 4. Add processing_status column (defaults to PROCESSING for all new uploads)
ALTER TABLE posts ADD COLUMN processing_status processing_status NOT NULL DEFAULT 'PROCESSING';
