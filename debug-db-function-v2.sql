-- Debug version of database function with detailed logging
-- This will help us see if the function is being called twice or processing incorrectly

CREATE OR REPLACE FUNCTION execute_trade_match_debug_v2(
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
    buy_current_amount DECIMAL;
    sell_current_amount DECIMAL;
    result_text TEXT;
BEGIN
    result_text := 'FUNCTION START - ' || p_buy_order_id || ' + ' || p_sell_order_id || ' for ' || p_trade_amount_wc || ' WC' || chr(10);
    
    -- Check if buy order exists and get current amount
    SELECT user_id, amount_wc INTO buy_user_id, buy_current_amount 
    FROM orders WHERE id = p_buy_order_id;
    GET DIAGNOSTICS buy_count = ROW_COUNT;
    
    result_text := result_text || 'Buy order found: ' || buy_count || ', current amount: ' || buy_current_amount || chr(10);
    
    IF buy_count = 0 THEN
        RETURN result_text || 'ERROR: Buy order not found: ' || p_buy_order_id;
    END IF;
    
    -- Check if sell order exists and get current amount
    SELECT user_id, amount_wc INTO sell_user_id, sell_current_amount 
    FROM orders WHERE id = p_sell_order_id;
    GET DIAGNOSTICS sell_count = ROW_COUNT;
    
    result_text := result_text || 'Sell order found: ' || sell_count || ', current amount: ' || sell_current_amount || chr(10);
    
    IF sell_count = 0 THEN
        RETURN result_text || 'ERROR: Sell order not found: ' || p_sell_order_id;
    END IF;
    
    -- Check if we have enough amounts
    IF buy_current_amount < p_trade_amount_wc THEN
        RETURN result_text || 'ERROR: Buy order insufficient amount: ' || buy_current_amount || ' < ' || p_trade_amount_wc;
    END IF;
    
    IF sell_current_amount < p_trade_amount_wc THEN
        RETURN result_text || 'ERROR: Sell order insufficient amount: ' || sell_current_amount || ' < ' || p_trade_amount_wc;
    END IF;
    
    -- Update buy order
    result_text := result_text || 'Updating buy order: ' || p_buy_remaining_wc || ' remaining' || chr(10);
    UPDATE orders 
    SET 
        status = CASE WHEN p_buy_remaining_wc <= 0 THEN 'matched' ELSE 'open' END,
        amount_wc = CASE WHEN p_buy_remaining_wc <= 0 THEN amount_wc ELSE p_buy_remaining_wc END,
        updated_at = NOW()
    WHERE id = p_buy_order_id;
    
    result_text := result_text || 'Buy order updated' || chr(10);
    
    -- Update sell order  
    result_text := result_text || 'Updating sell order: ' || p_sell_remaining_wc || ' remaining' || chr(10);
    UPDATE orders
    SET 
        status = CASE WHEN p_sell_remaining_wc <= 0 THEN 'matched' ELSE 'open' END,
        amount_wc = CASE WHEN p_sell_remaining_wc <= 0 THEN amount_wc ELSE p_sell_remaining_wc END,
        updated_at = NOW()
    WHERE id = p_sell_order_id;
    
    result_text := result_text || 'Sell order updated' || chr(10);
    
    -- Create trade record
    result_text := result_text || 'Creating trade: ' || p_trade_amount_wc || ' WC for ' || p_trade_total_btc || ' BTC' || chr(10);
    INSERT INTO trades (amount_wc, total_btc, status, buyer_id, seller_id)
    VALUES (
        p_trade_amount_wc,
        p_trade_total_btc,
        'pending',
        buy_user_id,
        sell_user_id
    );
    
    result_text := result_text || 'Trade created successfully' || chr(10);
    result_text := result_text || 'FUNCTION END - SUCCESS';
    
    RETURN result_text;
EXCEPTION
    WHEN OTHERS THEN
        RETURN result_text || 'ERROR: ' || SQLERRM;
END;
$$;

-- Also create a simple test to call this function
-- You can run this after creating the function to test it:
-- SELECT execute_trade_match_debug_v2(
--     'buy-order-id-here'::uuid,
--     'sell-order-id-here'::uuid, 
--     100.0,
--     0.000001,
--     900.0,
--     4900.0
-- );