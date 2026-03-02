-- Add unique constraint on endpoint to support multi-device upsert
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
