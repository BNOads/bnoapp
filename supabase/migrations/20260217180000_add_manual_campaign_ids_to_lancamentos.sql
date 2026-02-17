-- Add manual_campaign_ids column to lancamentos table
-- Stores manually selected campaign IDs as a JSONB array of strings
ALTER TABLE lancamentos
ADD COLUMN IF NOT EXISTS manual_campaign_ids JSONB DEFAULT '[]'::jsonb;
