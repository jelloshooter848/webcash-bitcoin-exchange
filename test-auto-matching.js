// Test Automatic Order Matching Logic
// Run this in browser console after loading the WBX app

async function testAutoMatching() {
    console.log('🧪 Testing Automatic Order Matching Logic');
    
    if (!AppState.isAuthenticated) {
        console.error('❌ Please sign in first to test order matching');
        return;
    }
    
    try {
        // Clear existing orders first
        console.log('🧹 Clearing existing test orders...');
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .gt('created_at', '1900-01-01'); // Delete all orders
            
        if (deleteError) throw deleteError;
        
        // Test Case 1: Create crossed orders that should auto-match
        console.log('📝 Test Case 1: Creating crossed orders');
        
        // Create sell order at 600 WC/sat (lower price)
        const sellPrice = Utils.wcPerSatToBtcPrice(600);
        const { error: sellError } = await supabase
            .from('orders')
            .insert([{
                user_id: AppState.user.id,
                type: 'sell',
                amount_wc: 1000,
                price_btc: sellPrice,
                status: 'open'
            }]);
            
        if (sellError) throw sellError;
        console.log('✅ Created sell order: 1000 WC at 600 WC/sat');
        
        // Now create buy order at 800 WC/sat (higher price) - this should trigger matching
        const buyPrice = Utils.wcPerSatToBtcPrice(800);
        const { error: buyError } = await supabase
            .from('orders')
            .insert([{
                user_id: AppState.user.id,
                type: 'buy',
                amount_wc: 500,
                price_btc: buyPrice,
                status: 'open'
            }]);
            
        if (buyError) throw buyError;
        console.log('✅ Created buy order: 500 WC at 800 WC/sat');
        
        // Trigger automatic matching
        console.log('⚡ Triggering automatic matching...');
        const tradesExecuted = await Market.executeAutomaticMatching();
        
        if (tradesExecuted) {
            console.log('✅ SUCCESS: Trades were executed automatically!');
            
            // Check the resulting order book
            const { data: remainingOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'open');
                
            console.log('📊 Remaining orders after matching:', remainingOrders);
            
            // Check trades created
            const { data: trades } = await supabase
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
                
            console.log('💰 Recent trades:', trades);
            
        } else {
            console.log('❌ FAILURE: No trades were executed (this is the bug we fixed)');
        }
        
        // Test Case 2: Create non-crossed orders that should NOT auto-match
        console.log('\n📝 Test Case 2: Creating non-crossed orders');
        
        // Clear orders again
        await supabase.from('orders').delete().gt('created_at', '1900-01-01');
        
        // Create sell order at 1000 WC/sat
        const sellPrice2 = Utils.wcPerSatToBtcPrice(1000);
        await supabase.from('orders').insert([{
            user_id: AppState.user.id,
            type: 'sell',
            amount_wc: 1000,
            price_btc: sellPrice2,
            status: 'open'
        }]);
        
        // Create buy order at 800 WC/sat (lower than sell)
        const buyPrice2 = Utils.wcPerSatToBtcPrice(800);
        await supabase.from('orders').insert([{
            user_id: AppState.user.id,
            type: 'buy',
            amount_wc: 500,
            price_btc: buyPrice2,
            status: 'open'
        }]);
        
        console.log('✅ Created non-crossed orders: sell at 1000 WC/sat, buy at 800 WC/sat');
        
        const tradesExecuted2 = await Market.executeAutomaticMatching();
        
        if (!tradesExecuted2) {
            console.log('✅ SUCCESS: No trades executed for non-crossed orders (correct behavior)');
        } else {
            console.log('❌ FAILURE: Trades executed when they shouldn\'t have');
        }
        
        console.log('🎉 Test completed! Check the order book to see final state.');
        
        // Refresh UI
        if (AppState.orderBookVisible) {
            UI.refreshOrderBook();
        } else {
            UI.updateMarketPrice();
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Export for console use
window.testAutoMatching = testAutoMatching;

console.log('🧪 Test function loaded! Run testAutoMatching() in console to test the automatic matching logic.');