-- Migration 033: Add expo_push_token column to push_subscriptions for React Native mobile push
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(500) NULL;
