-- Migration: create_meta_campaign_insights
-- Stores daily insights from Meta Ads campaigns

CREATE TABLE IF NOT EXISTS meta_campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES meta_client_ad_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  date_start DATE,
  date_stop DATE,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  cpc NUMERIC,
  cpm NUMERIC,
  ctr NUMERIC,
  frequency NUMERIC,
  actions JSONB DEFAULT '{}'::jsonb,
  action_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ad_account_id, campaign_id, date_start)
);

-- RLS
ALTER TABLE meta_campaign_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read insights"
  ON meta_campaign_insights FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_insights_ad_account ON meta_campaign_insights(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_campaign_insights(date_start);
