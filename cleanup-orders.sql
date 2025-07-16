-- Clear all existing orders to fix conversion issues
-- Run this in Supabase SQL Editor

-- Delete all existing orders (they have wrong price conversions)
DELETE FROM orders;

-- Delete all existing trades
DELETE FROM trades;

-- Verify cleanup
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_trades FROM trades;