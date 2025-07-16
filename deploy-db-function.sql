-- Deploy the working database function for automatic matching
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION execute_trade_match_debug(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_trade_amount_wc DECIMAL,
    p_trade_total_btc DECIMAL,
    p_buy_remaining_wc DECIMAL,
    p_sell_remaining_wc DECIMAL
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    buy_user_id UUID;
    sell_user_id UUID;
    buy_count INTEGER;
    sell_count INTEGER;
BEGIN
    -- Check if buy order exists
    SELECT user_id INTO buy_user_id FROM orders WHERE id = p_buy_order_id;
    GET DIAGNOSTICS buy_count = ROW_COUNT;
    
    IF buy_count = 0 THEN
        RETURN 'ERROR: Buy order not found: ' || p_buy_order_id;
    END IF;
    
    -- Check if sell order exists
    SELECT user_id INTO sell_user_id FROM orders WHERE id = p_sell_order_id;
    GET DIAGNOSTICS sell_count = ROW_COUNT;
    
    IF sell_count = 0 THEN
        RETURN 'ERROR: Sell order not found: ' || p_sell_order_id;
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
    
    -- Create trade record with 'pending' status (matches constraint)
    INSERT INTO trades (amount_wc, total_btc, status, buyer_id, seller_id)
    VALUES (
        p_trade_amount_wc,
        p_trade_total_btc,
        'pending',
        buy_user_id,
        sell_user_id
    );
    
    RETURN 'SUCCESS';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;