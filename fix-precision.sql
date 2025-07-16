-- Fix database precision for tiny Bitcoin amounts
-- Run this in Supabase SQL Editor

-- Update the price_btc column to allow more decimal places
ALTER TABLE orders ALTER COLUMN price_btc TYPE NUMERIC(30,18);

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'price_btc';