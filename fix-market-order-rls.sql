-- Database function for market order execution to bypass RLS
-- This handles updating a single order and creating a trade record

CREATE OR REPLACE FUNCTION execute_market_trade(
    p_order_id UUID,
    p_new_amount_wc DECIMAL,
    p_new_status TEXT,
    p_trade_amount_wc DECIMAL,
    p_trade_total_btc DECIMAL,
    p_buyer_id UUID,
    p_seller_id UUID
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    result_text TEXT;
BEGIN
    result_text := 'MARKET TRADE START - Order: ' || p_order_id || ', Amount: ' || p_trade_amount_wc || ' WC' || chr(10);
    
    -- Update the existing order
    UPDATE orders 
    SET 
        status = p_new_status,
        amount_wc = CASE WHEN p_new_status = 'matched' THEN amount_wc ELSE p_new_amount_wc END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    result_text := result_text || 'Order updated: ' || p_new_status || ', new amount: ' || p_new_amount_wc || chr(10);
    
    -- Create trade record
    INSERT INTO trades (amount_wc, total_btc, status, buyer_id, seller_id)
    VALUES (
        p_trade_amount_wc,
        p_trade_total_btc,
        'pending',
        p_buyer_id,
        p_seller_id
    );
    
    result_text := result_text || 'Trade created: ' || p_trade_amount_wc || ' WC for ' || p_trade_total_btc || ' BTC' || chr(10);
    result_text := result_text || 'MARKET TRADE SUCCESS';
    
    RETURN result_text;
EXCEPTION
    WHEN OTHERS THEN
        RETURN result_text || 'ERROR: ' || SQLERRM;
END;
$$;