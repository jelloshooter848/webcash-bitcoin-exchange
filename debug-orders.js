// Debug script to check order status in database
// Run this in browser console after a trade

async function debugOrders() {
    console.log('🔍 Debugging order status...');
    
    try {
        // Get ALL orders (not just open ones)
        const { data: allOrders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        console.log('📊 Recent orders (all statuses):');
        console.table(allOrders.map(order => ({
            id: order.id,
            user_id: order.user_id.slice(0, 8) + '...',
            type: order.type,
            amount_wc: order.amount_wc,
            price_wc_per_sat: Utils.btcPriceToWcPerSat(order.price_btc),
            status: order.status,
            created: new Date(order.created_at).toLocaleTimeString(),
            updated: new Date(order.updated_at).toLocaleTimeString()
        })));
        
        // Get recent trades
        const { data: trades, error: tradeError } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (tradeError) throw tradeError;
        
        console.log('💰 Recent trades:');
        console.table(trades.map(trade => ({
            id: trade.id,
            buyer: trade.buyer_id.slice(0, 8) + '...',
            seller: trade.seller_id.slice(0, 8) + '...',
            amount_wc: trade.amount_wc,
            total_btc: trade.total_btc,
            price_wc_per_sat: Math.round(trade.amount_wc / (trade.total_btc * 100000000)),
            status: trade.status,
            created: new Date(trade.created_at).toLocaleTimeString()
        })));
        
        // Check what the UI is showing vs what's in DB
        const openOrders = allOrders.filter(order => order.status === 'open');
        console.log(`\n📈 Summary:`);
        console.log(`- Total orders in DB: ${allOrders.length}`);
        console.log(`- Open orders: ${openOrders.length}`);
        console.log(`- Matched/Cancelled orders: ${allOrders.length - openOrders.length}`);
        console.log(`- Recent trades: ${trades.length}`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

// Export for console use
window.debugOrders = debugOrders;

console.log('🔧 Debug function loaded! Run debugOrders() to check order status.');