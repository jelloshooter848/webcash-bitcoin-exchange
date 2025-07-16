-- Check if the database function exists and is working
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'execute_trade_match_debug';

-- Test the function with dummy data
-- SELECT execute_trade_match_debug(
--     '00000000-0000-0000-0000-000000000001'::uuid,
--     '00000000-0000-0000-0000-000000000002'::uuid,
--     1.0,
--     0.000000001,
--     0.0,
--     0.0
-- );