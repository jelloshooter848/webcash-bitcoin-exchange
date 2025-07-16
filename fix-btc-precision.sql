-- Fix BTC precision issues in trades table
-- The current constraint might be failing due to extremely small BTC values

-- First, let's check what the constraint actually is
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'trades_total_btc_check';

-- If the constraint is causing issues with very small values, we can either:
-- 1. Modify the constraint to allow smaller values
-- 2. Change the precision of the NUMERIC field

-- Option 1: Drop and recreate the constraint with better handling
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_total_btc_check;
ALTER TABLE trades ADD CONSTRAINT trades_total_btc_check CHECK (total_btc > 0::numeric);

-- Option 2: Increase precision of the field (if needed)
-- ALTER TABLE trades ALTER COLUMN total_btc TYPE NUMERIC(30,20);

-- Let's also check current trades to see if any exist
SELECT * FROM trades;