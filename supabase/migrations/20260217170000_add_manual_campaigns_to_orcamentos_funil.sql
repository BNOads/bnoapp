-- Add manual_campaigns column to orcamentos_funil
-- Stores manually linked/unlinked campaign IDs as JSONB
-- Format: { "added": ["campaign_id_1", ...], "removed": ["campaign_id_2", ...] }
ALTER TABLE orcamentos_funil
ADD COLUMN IF NOT EXISTS manual_campaigns JSONB DEFAULT '{"added":[],"removed":[]}'::jsonb;
