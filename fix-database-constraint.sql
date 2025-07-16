test-auto-matching.js:136 🧪 Test function loaded! Run testAutoMatching() in console to test the automatic matching logic.
debug-orders.js:66 🔧 Debug function loaded! Run debugOrders() to check order status.
app.js:397 🔄 Fetching fresh order data for matching
app.js:412 🔄 Found orders for matching: 3
app.js:414   BUY: 5000 WC @ 1000 WC/sat (cb612039...)
app.js:414   SELL: 5000 WC @ 1000 WC/sat (82e64b09...)
app.js:414   BUY: 100 WC @ 1200 WC/sat (8e67d734...)
app.js:509 🔄 Executing automatic trade using database function: 1 fills
app.js:527 🔄 Calculation debug: {currentSellAmount: 5000, fillAmount: 100, calculatedRemaining: 4900, expected: 4900}
app.js:534 🔄 Calling execute_trade_match database function
app.js:537 🔄 Function parameters: {p_buy_order_id: '8e67d734-a2ac-4677-8645-64fe7a1f30d0', p_sell_order_id: '82e64b09-a96c-4ff9-9501-96f46b23e526', p_trade_amount_wc: 100, p_trade_total_btc: 1e-9, p_buy_remaining_wc: 0, …}
app.js:555 🔄 Database function result: {data: 'FUNCTION START - 8e67d734-a2ac-4677-8645-64fe7a1f3…Trade created successfully\nFUNCTION END - SUCCESS', error: null}
app.js:563 ❌ Database function failed: FUNCTION START - 8e67d734-a2ac-4677-8645-64fe7a1f30d0 + 82e64b09-a96c-4ff9-9501-96f46b23e526 for 100 WC
Buy order found: 1, current amount: 100.00000000
Sell order found: 1, current amount: 5000.00000000
Updating buy order: 0 remaining
Buy order updated
Updating sell order: 4900 remaining
Sell order updated
Creating trade: 100 WC for 0.000000001 BTC
Trade created successfully
FUNCTION END - SUCCESS
executeAutomaticTrade @ app.js:563
await in executeAutomaticTrade
executeAutomaticMatching @ app.js:477
await in executeAutomaticMatching
placeLimitOrder @ app.js:356
await in placeLimitOrder
handleLimitBuy @ app.js:1179
(anonymous) @ app.js:669
app.js:496 Auto-matching failed: Error: Automatic trade execution failed: Database function failed: FUNCTION START - 8e67d734-a2ac-4677-8645-64fe7a1f30d0 + 82e64b09-a96c-4ff9-9501-96f46b23e526 for 100 WC
Buy order found: 1, current amount: 100.00000000
Sell order found: 1, current amount: 5000.00000000
Updating buy order: 0 remaining
Buy order updated
Updating sell order: 4900 remaining
Sell order updated
Creating trade: 100 WC for 0.000000001 BTC
Trade created successfully
FUNCTION END - SUCCESS
    at Object.executeAutomaticTrade (app.js:584:19)
    at async Object.executeAutomaticMatching (app.js:477:21)
    at async Object.placeLimitOrder (app.js:356:36)
executeAutomaticMatching @ app.js:496
await in executeAutomaticMatching
placeLimitOrder @ app.js:356
await in placeLimitOrder
handleLimitBuy @ app.js:1179
(anonymous) @ app.js:669
