-- Test the database function directly
-- Replace these UUIDs with actual order IDs from your error log

-- First, let's see what orders exist
SELECT id, user_id, type, amount_wc, price_btc, status FROM orders WHERE status = 'open';

-- Test the function with real order IDs (replace these with actual IDs from your admin panel)
SELECT execute_trade_match(
    'c96135fe-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,  -- replace with actual buy order ID
    '763cc04d-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,  -- replace with actual sell order ID
    1.0,     -- trade amount WC
    0.000000000011,  -- trade total BTC (1 WC at 900 WC/sat)
    0.0,     -- buy remaining (0 = fully filled)
    0.0      -- sell remaining (0 = fully filled)
);

-- Check if any error messages were logged
-- (This might not show in SQL editor, but will show in Logs section)