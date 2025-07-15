-- Fixed SQL function to execute trades with elevated permissions
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION execute_trade_match(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_trade_amount_wc DECIMAL,
    p_trade_total_btc DECIMAL,
    p_buy_remaining_wc DECIMAL,
    p_sell_remaining_wc DECIMAL
)
RETURNS BOOLEAN
SECURITY DEFINER -- This allows the function to bypass RLS
LANGUAGE plpgsql
AS $$
DECLARE
    buy_user_id UUID;
    sell_user_id UUID;
BEGIN
    -- Get user IDs first
    SELECT user_id INTO buy_user_id FROM orders WHERE id = p_buy_order_id;
    SELECT user_id INTO sell_user_id FROM orders WHERE id = p_sell_order_id;
    
    -- Check if orders exist
    IF buy_user_id IS NULL OR sell_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update buy order
    UPDATE orders 
    SET 
        status = CASE WHEN p_buy_remaining_wc <= 0 THEN 'matched' ELSE 'open' END,
        amount_wc = CASE WHEN p_buy_remaining_wc <= 0 THEN amount_wc ELSE p_buy_remaining_wc END,
        updated_at = NOW()
    WHERE id = p_buy_order_id;
    
    -- Update sell order  
    UPDATE orders
    SET 
        status = CASE WHEN p_sell_remaining_wc <= 0 THEN 'matched' ELSE 'open' END,
        amount_wc = CASE WHEN p_sell_remaining_wc <= 0 THEN amount_wc ELSE p_sell_remaining_wc END,
        updated_at = NOW()
    WHERE id = p_sell_order_id;
    
    -- Create trade record with 'completed' status
    INSERT INTO trades (amount_wc, total_btc, status, buyer_id, seller_id)
    VALUES (
        p_trade_amount_wc,
        p_trade_total_btc,
        'completed',
        buy_user_id,
        sell_user_id
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (optional)
        RAISE WARNING 'execute_trade_match failed: %', SQLERRM;
        RETURN FALSE;
END;
$$;