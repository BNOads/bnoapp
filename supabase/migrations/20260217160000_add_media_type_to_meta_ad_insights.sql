-- Migration: add_media_type_to_meta_ad_insights
-- Adds media_type column to store 'video', 'image', 'carousel'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_ad_insights' AND column_name = 'media_type') THEN
        ALTER TABLE meta_ad_insights ADD COLUMN media_type TEXT;
    END IF;
END $$;
