-- Test what status values are actually allowed in the trades table
-- Run this in Supabase SQL Editor

-- Check the current constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'trades'::regclass 
AND contype = 'c';

-- Try inserting a test record with 'settled' status
-- (This will help us see if 'settled' is actually allowed)
-- Replace these UUIDs with real user IDs from your auth.users table

-- First, let's see what user IDs exist
SELECT id FROM auth.users LIMIT 2;