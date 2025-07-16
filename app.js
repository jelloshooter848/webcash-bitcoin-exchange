// WBX Exchange - Main Application Logic

/**
 * Application State
 */
const AppState = {
    user: null,
    currentPrice: null,
    orders: [],
    isAuthenticated: false,
    orderBookVisible: false,
    tradeHistoryVisible: false,
    adminPanelVisible: false
};

/**
 * Authentication Functions
 */
const Auth = {
    /**
     * Sign up new user
     */
    async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            
            Utils.showNotification('Account created successfully! Check your email for verification.', 'success');
            return data;
        } catch (error) {
            Utils.showNotification(`Sign up failed: ${error.message}`, 'error');
            return null;
        }
    },
    
    /**
     * Sign in existing user
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            Utils.showNotification('Signed in successfully!', 'success');
            return data;
        } catch (error) {
            Utils.showNotification(`Sign in failed: ${error.message}`, 'error');
            return null;
        }
    },
    
    /**
     * Sign out current user
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            Utils.showNotification('Signed out successfully!', 'success');
        } catch (error) {
            Utils.showNotification(`Sign out failed: ${error.message}`, 'error');
        }
    },
    
    /**
     * Handle authentication state changes
     */
    onAuthStateChange(callback) {
        supabase.auth.onAuthStateChange((event, session) => {
            AppState.user = session?.user || null;
            AppState.isAuthenticated = !!session;
            callback(event, session);
        });
    }
};

/**
 * Market Functions
 */
const Market = {
    /**
     * Calculate current market price from order book
     */
    calculateMarketPrice(orders) {
        const openOrders = orders.filter(order => order.status === 'open');
        
        // Convert to WC/sat for proper market logic
        const buyOrders = openOrders
            .filter(order => order.type === 'buy')
            .map(order => ({
                ...order,
                wcPerSat: Utils.btcPriceToWcPerSat(order.price_btc)
            }))
            .sort((a, b) => b.wcPerSat - a.wcPerSat); // Highest WC/sat first (best buy)
        
        const sellOrders = openOrders
            .filter(order => order.type === 'sell')
            .map(order => ({
                ...order,
                wcPerSat: Utils.btcPriceToWcPerSat(order.price_btc)
            }))
            .sort((a, b) => a.wcPerSat - b.wcPerSat); // Lowest WC/sat first (best sell)
        
        if (buyOrders.length === 0 || sellOrders.length === 0) {
            return null; // No liquidity
        }
        
        const bestBuyWcPerSat = buyOrders[0].wcPerSat;
        const bestSellWcPerSat = sellOrders[0].wcPerSat;
        
        // Convert back to BTC for storage/consistency, then return
        const avgWcPerSat = (bestBuyWcPerSat + bestSellWcPerSat) / 2;
        return Utils.wcPerSatToBtcPrice(avgWcPerSat);
    },
    
    /**
     * Execute market buy order
     */
    async marketBuy(amountWC) {
        try {
            if (!AppState.isAuthenticated) {
                throw new Error('Please sign in to trade');
            }
            
            if (!Utils.validateNumericInput(amountWC, 0.01)) {
                throw new Error('Invalid amount');
            }
            
            // Get open sell orders sorted by price (ascending)
            const { data: sellOrders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('type', 'sell')
                .eq('status', 'open')
                .order('price_btc', { ascending: true });
            
            if (error) throw error;
            
            if (sellOrders.length === 0) {
                throw new Error('No sell orders available');
            }
            
            let remainingAmount = parseFloat(amountWC);
            let totalBTC = 0;
            const fills = [];
            
            // Fill from cheapest sells
            for (const order of sellOrders) {
                if (remainingAmount <= 0) break;
                if (order.user_id === AppState.user.id) continue; // Prevent self-trading
                
                const fillAmount = Math.min(remainingAmount, order.amount_wc);
                const fillTotal = parseFloat((fillAmount * order.price_btc).toFixed(20));
                
                fills.push({
                    orderId: order.id,
                    amount: fillAmount,
                    price: order.price_btc,
                    total: fillTotal,
                    originalOrder: order
                });
                
                remainingAmount -= fillAmount;
                totalBTC += fillTotal;
            }
            
            if (remainingAmount > 0) {
                throw new Error('Insufficient liquidity for full order');
            }
            
            // Execute the fills in database transaction
            await this.executeMarketTrade(fills, 'buy', amountWC, totalBTC);
            Utils.showNotification(`Market buy executed: ${amountWC} WC for ${Utils.formatCurrency(totalBTC, 'BTC')}`, 'success');
            
        } catch (error) {
            Utils.showNotification(`Market buy failed: ${error.message}`, 'error');
        }
    },
    
    /**
     * Execute market sell order
     */
    async marketSell(amountWC) {
        try {
            if (!AppState.isAuthenticated) {
                throw new Error('Please sign in to trade');
            }
            
            if (!Utils.validateNumericInput(amountWC, 0.01)) {
                throw new Error('Invalid amount');
            }
            
            // Get open buy orders sorted by price (descending)
            const { data: buyOrders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('type', 'buy')
                .eq('status', 'open')
                .order('price_btc', { ascending: false });
            
            if (error) throw error;
            
            if (buyOrders.length === 0) {
                throw new Error('No buy orders available');
            }
            
            let remainingAmount = parseFloat(amountWC);
            let totalBTC = 0;
            const fills = [];
            
            // Fill from highest buys
            for (const order of buyOrders) {
                if (remainingAmount <= 0) break;
                if (order.user_id === AppState.user.id) continue; // Prevent self-trading
                
                const fillAmount = Math.min(remainingAmount, order.amount_wc);
                const fillTotal = parseFloat((fillAmount * order.price_btc).toFixed(20));
                
                fills.push({
                    orderId: order.id,
                    amount: fillAmount,
                    price: order.price_btc,
                    total: fillTotal,
                    originalOrder: order
                });
                
                remainingAmount -= fillAmount;
                totalBTC += fillTotal;
            }
            
            if (remainingAmount > 0) {
                throw new Error('Insufficient liquidity for full order');
            }
            
            // Execute the fills in database transaction
            await this.executeMarketTrade(fills, 'sell', amountWC, totalBTC);
            Utils.showNotification(`Market sell executed: ${amountWC} WC for ${Utils.formatCurrency(totalBTC, 'BTC')}`, 'success');
            
        } catch (error) {
            Utils.showNotification(`Market sell failed: ${error.message}`, 'error');
        }
    },

    /**
     * Execute market trade by updating orders and creating trade records
     */
    async executeMarketTrade(fills, tradeType, totalAmount, totalBTC) {
        try {
            // Process each fill
            for (const fill of fills) {
                const remainingAmount = fill.originalOrder.amount_wc - fill.amount;
                const isCompletelyFilled = fill.amount >= fill.originalOrder.amount_wc;
                
                // Update the matched order
                const updateData = {
                    status: isCompletelyFilled ? 'matched' : 'open',
                    updated_at: new Date().toISOString()
                };
                
                // Only update amount_wc if order is not completely filled (to avoid constraint violation)
                if (!isCompletelyFilled) {
                    updateData.amount_wc = remainingAmount;
                }
                
                const { error: updateError } = await supabase
                    .from('orders')
                    .update(updateData)
                    .eq('id', fill.orderId);

                if (updateError) throw updateError;

                // Create trade record
                // Convert scientific notation to decimal to avoid database constraint issues
                const totalBtcDecimal = parseFloat(fill.total.toFixed(20));
                const tradeData = {
                    amount_wc: parseFloat(fill.amount.toFixed(8)),
                    total_btc: totalBtcDecimal > 0 ? totalBtcDecimal : 0.00000000000000000001,
                    status: 'pending'
                };

                if (tradeType === 'buy') {
                    tradeData.buyer_id = AppState.user.id;
                    tradeData.seller_id = fill.originalOrder.user_id;
                } else {
                    tradeData.seller_id = AppState.user.id;
                    tradeData.buyer_id = fill.originalOrder.user_id;
                }

                const { error: tradeError } = await supabase
                    .from('trades')
                    .insert([tradeData]);

                if (tradeError) throw tradeError;
            }

            // Wait a moment for database changes to propagate, then refresh
            setTimeout(() => {
                if (AppState.orderBookVisible) {
                    // refreshOrderBook() already updates market price
                    UI.refreshOrderBook();
                } else {
                    // Only update price if order book is hidden
                    UI.updateMarketPrice();
                }
            }, 100);

        } catch (error) {
            throw new Error(`Trade execution failed: ${error.message}`);
        }
    },

    /**
     * Place a limit order (buy or sell)
     */
    async placeLimitOrder(type, amount, price) {
        try {
            if (!AppState.isAuthenticated) {
                throw new Error('Please sign in to place orders');
            }
            
            if (!Utils.validateNumericInput(amount, 0.01)) {
                throw new Error('Invalid amount');
            }
            
            if (!Utils.validateNumericInput(price, 1)) {
                throw new Error('Invalid price (minimum 1 WC/sat)');
            }

            // Convert WC/sat to BTC price for database storage
            const priceInBtc = Utils.wcPerSatToBtcPrice(parseFloat(price));
            
            // Insert the limit order into database
            const { data, error } = await supabase
                .from('orders')
                .insert([{
                    user_id: AppState.user.id,
                    type: type,
                    amount_wc: parseFloat(amount),
                    price_btc: priceInBtc,
                    status: 'open'
                }])
                .select();

            if (error) throw error;

            // Check for immediate matches with the new order
            const tradesExecuted = await this.executeAutomaticMatching();
            
            Utils.showNotification(
                `${type.charAt(0).toUpperCase() + type.slice(1)} order placed: ${amount} WC at ${Utils.formatCurrency(price, 'WC_PER_SAT')}`, 
                'success'
            );

            // Clear the limit order inputs
            document.getElementById('limit-amount').value = '';
            document.getElementById('limit-price').value = '';

            // Refresh displays
            UI.refreshMyOrders();
            if (AppState.orderBookVisible || tradesExecuted) {
                if (AppState.orderBookVisible) {
                    UI.refreshOrderBook();
                } else {
                    // Update market price if order book is hidden but trades occurred
                    UI.updateMarketPrice();
                }
            }

        } catch (error) {
            Utils.showNotification(`Order placement failed: ${error.message}`, 'error');
        }
    },

    /**
     * Check for and execute automatic order matching
     * Enhanced to walk entire book like market orders do
     */
    async executeAutomaticMatching() {
        try {
            // Prevent duplicate executions
            if (this._matchingInProgress) {
                console.log('🔒 Automatic matching already in progress, skipping');
                return false;
            }
            this._matchingInProgress = true;
            
            // Get fresh order data from database (not stale cached data)
            console.log('🔄 Fetching fresh order data for matching');
            
            // Get all open orders
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: true }); // First come, first served

            if (error) throw error;
            if (!orders || orders.length < 2) {
                console.log('🔄 Not enough orders for matching:', orders?.length || 0);
                return false; // Need at least 2 orders to match
            }
            
            console.log('🔄 Found orders for matching:', orders.length);
            orders.forEach(order => {
                console.log(`  ${order.type.toUpperCase()}: ${order.amount_wc} WC @ ${Utils.btcPriceToWcPerSat(order.price_btc)} WC/sat (${order.id.substring(0, 8)}...)`);
            });

            // Convert to WC/sat and separate by type
            const buyOrders = orders
                .filter(order => order.type === 'buy')
                .map(order => ({
                    ...order,
                    wcPerSat: Utils.btcPriceToWcPerSat(order.price_btc)
                }))
                .sort((a, b) => b.wcPerSat - a.wcPerSat); // Highest WC/sat first

            const sellOrders = orders
                .filter(order => order.type === 'sell')
                .map(order => ({
                    ...order,
                    wcPerSat: Utils.btcPriceToWcPerSat(order.price_btc)
                }))
                .sort((a, b) => a.wcPerSat - b.wcPerSat); // Lowest WC/sat first

            let tradesExecuted = false;

            // Enhanced matching: walk entire book for each buy order
            for (const buyOrder of buyOrders) {
                if (buyOrder.amount_wc <= 0) continue; // Skip if already filled
                
                let remainingBuyAmount = buyOrder.amount_wc;
                const fills = [];
                let totalBTC = 0;

                // Walk through all compatible sell orders for this buy order
                for (const sellOrder of sellOrders) {
                    if (sellOrder.amount_wc <= 0) continue; // Skip if already filled
                    if (buyOrder.wcPerSat < sellOrder.wcPerSat) break; // No more matches possible
                    if (buyOrder.user_id === sellOrder.user_id) continue; // Prevent self-trading
                    
                    // Calculate fill amount
                    const fillAmount = Math.min(remainingBuyAmount, sellOrder.amount_wc);
                    const fillTotal = parseFloat((fillAmount * sellOrder.price_btc).toFixed(20));
                    
                    fills.push({
                        orderId: sellOrder.id,
                        amount: fillAmount,
                        price: sellOrder.price_btc,
                        total: fillTotal,
                        originalOrder: sellOrder
                    });
                    
                    remainingBuyAmount -= fillAmount;
                    totalBTC += fillTotal;
                    
                    // Update local sell order amount for further matching
                    sellOrder.amount_wc -= fillAmount;
                    
                    // If buy order is completely filled, stop
                    if (remainingBuyAmount <= 0) break;
                }

                // Execute all fills for this buy order if any matches found
                if (fills.length > 0) {
                    const filledAmount = buyOrder.amount_wc - remainingBuyAmount;
                    
                    // Execute the fills using database function (handles both buy and sell order updates)
                    await this.executeAutomaticTrade(buyOrder, fills, filledAmount, totalBTC);

                    // Calculate average execution price for notification
                    const avgPriceWcPerSat = Math.round(filledAmount / (totalBTC * 100000000));
                    Utils.showNotification(
                        `Auto-matched: ${filledAmount} WC at avg ${Utils.formatCurrency(avgPriceWcPerSat, 'WC_PER_SAT')}`,
                        'info'
                    );

                    tradesExecuted = true;

                    // Update local buy order amount
                    buyOrder.amount_wc = remainingBuyAmount;
                }
            }

            return tradesExecuted;

        } catch (error) {
            console.error('Auto-matching failed:', error);
            return false;
        } finally {
            // Always release the lock
            this._matchingInProgress = false;
        }
    },

    /**
     * Execute automatic trade between different users using database function
     */
    async executeAutomaticTrade(buyOrder, fills, filledAmount, totalBTC) {
        try {
            console.log('🔄 Executing automatic trade using database function:', fills.length, 'fills');
            
            // Process each fill using the database function
            for (const fill of fills) {
                const buyRemainingWc = buyOrder.amount_wc - fill.amount;
                
                // Get the current sell order amount from database (not the modified JavaScript amount)
                const { data: currentSellOrder, error: fetchError } = await supabase
                    .from('orders')
                    .select('amount_wc')
                    .eq('id', fill.orderId)
                    .single();
                
                if (fetchError) throw fetchError;
                
                // Calculate remaining amount based on current database amount
                const sellRemainingWc = currentSellOrder.amount_wc - fill.amount;
                
                console.log('🔄 Calculation debug:', {
                    currentSellAmount: currentSellOrder.amount_wc,
                    fillAmount: fill.amount,
                    calculatedRemaining: sellRemainingWc,
                    expected: currentSellOrder.amount_wc - fill.amount
                });
                
                console.log('🔄 Calling execute_trade_match database function');
                
                // Call the database function to update both orders and create trade
                console.log('🔄 Function parameters:', {
                    p_buy_order_id: buyOrder.id,
                    p_sell_order_id: fill.orderId,
                    p_trade_amount_wc: fill.amount,
                    p_trade_total_btc: fill.total,
                    p_buy_remaining_wc: buyRemainingWc,
                    p_sell_remaining_wc: sellRemainingWc
                });
                
                const { data, error } = await supabase.rpc('execute_trade_match_debug_v2', {
                    p_buy_order_id: buyOrder.id,
                    p_sell_order_id: fill.orderId,
                    p_trade_amount_wc: fill.amount,
                    p_trade_total_btc: fill.total,
                    p_buy_remaining_wc: buyRemainingWc,
                    p_sell_remaining_wc: sellRemainingWc
                });

                console.log('🔄 Database function result:', { data, error });

                if (error) {
                    console.error('❌ Database function failed with error:', error);
                    throw error;
                }
                
                if (!data.includes('FUNCTION END - SUCCESS')) {
                    console.error('❌ Database function failed:', data);
                    throw new Error(`Database function failed: ${data}`);
                }
                
                console.log('✅ Trade executed successfully via database function');
                
                // Update local order amounts for further matching
                buyOrder.amount_wc = buyRemainingWc;
                fill.originalOrder.amount_wc = sellRemainingWc;
            }

            // Wait a moment for database changes to propagate, then refresh
            setTimeout(() => {
                if (AppState.orderBookVisible) {
                    UI.refreshOrderBook();
                } else {
                    UI.updateMarketPrice();
                }
            }, 100);

        } catch (error) {
            throw new Error(`Automatic trade execution failed: ${error.message}`);
        }
    },

    /**
     * Cancel a user's order
     */
    async cancelOrder(orderId) {
        try {
            if (!AppState.isAuthenticated) {
                throw new Error('Please sign in to cancel orders');
            }

            // Update order status to cancelled (only if it belongs to current user)
            const { data, error } = await supabase
                .from('orders')
                .update({ 
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .eq('user_id', AppState.user.id) // Security: only cancel own orders
                .eq('status', 'open') // Only cancel open orders
                .select();

            if (error) throw error;
            
            if (data && data.length > 0) {
                const cancelledOrder = data[0];
                Utils.showNotification(
                    `Order cancelled: ${cancelledOrder.type} ${cancelledOrder.amount_wc} WC at ${Utils.formatCurrency(Utils.btcPriceToWcPerSat(cancelledOrder.price_btc), 'WC_PER_SAT')}`,
                    'info'
                );

                // Refresh displays
                UI.refreshMyOrders();
                if (AppState.orderBookVisible) {
                    UI.refreshOrderBook();
                } else {
                    UI.updateMarketPrice();
                }
                
                return true;
            } else {
                throw new Error('Order not found or not cancellable');
            }

        } catch (error) {
            Utils.showNotification(`Cancel failed: ${error.message}`, 'error');
            return false;
        }
    }
};

/**
 * UI Functions
 */
const UI = {
    /**
     * Initialize the user interface
     */
    init() {
        this.setupEventListeners();
        this.renderAuthSection();
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auth form submission
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('auth-form')) {
                e.preventDefault();
                this.handleAuthSubmit(e.target);
            }
        });
        
        // Trading buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('market-buy-btn')) {
                this.handleMarketBuy();
            } else if (e.target.classList.contains('market-sell-btn')) {
                this.handleMarketSell();
            } else if (e.target.classList.contains('limit-buy-btn')) {
                this.handleLimitBuy();
            } else if (e.target.classList.contains('limit-sell-btn')) {
                this.handleLimitSell();
            } else if (e.target.classList.contains('toggle-btn')) {
                this.toggleOrderBook();
            } else if (e.target.classList.contains('toggle-trades-btn')) {
                this.toggleTradeHistory();
            } else if (e.target.classList.contains('toggle-admin-btn')) {
                this.toggleAdminPanel();
            } else if (e.target.classList.contains('refresh-admin-btn')) {
                this.refreshAdminData();
            } else if (e.target.classList.contains('sign-out-btn')) {
                Auth.signOut();
            } else if (e.target.classList.contains('cancel-order-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                Market.cancelOrder(orderId);
            }
        });
    },
    
    /**
     * Render authentication section
     */
    renderAuthSection() {
        const authSection = document.getElementById('auth-section');
        
        if (AppState.isAuthenticated) {
            authSection.innerHTML = `
                <span>Welcome, ${AppState.user.email}</span>
                <button class="auth-form button sign-out-btn">Sign Out</button>
            `;
            this.showMarketSection();
        } else {
            authSection.innerHTML = `
                <form class="auth-form" data-type="signin">
                    <input type="email" placeholder="Email" required>
                    <input type="password" placeholder="Password" required>
                    <button type="submit">Sign In</button>
                </form>
                <form class="auth-form" data-type="signup">
                    <input type="email" placeholder="Email" required>
                    <input type="password" placeholder="Password" required>
                    <button type="submit">Sign Up</button>
                </form>
            `;
            this.hideMarketSection();
        }
    },
    
    /**
     * Handle authentication form submission
     */
    async handleAuthSubmit(form) {
        const type = form.dataset.type;
        const email = form.querySelector('input[type="email"]')?.value;
        const password = form.querySelector('input[type="password"]')?.value;
        
        if (type === 'signin') {
            await Auth.signIn(email, password);
        } else if (type === 'signup') {
            await Auth.signUp(email, password);
        }
    },
    
    /**
     * Show market trading section
     */
    showMarketSection() {
        const marketSection = document.getElementById('market-section');
        marketSection.style.display = 'block';
        marketSection.innerHTML = `
            <div class="market-price">
                <h2>Current Market Price</h2>
                <div class="current-price" id="current-price">
                    ${AppState.currentPrice ? Utils.formatCurrency(Utils.btcPriceToWcPerSat(AppState.currentPrice), 'WC_PER_SAT') : 'No Liquidity'}
                </div>
            </div>
            <div class="trading-interface">
                <div class="market-orders">
                    <h3>Market Orders (Instant)</h3>
                    <div class="trade-controls">
                        <div class="trade-input">
                            <label for="market-amount">WebCash Amount</label>
                            <input type="number" id="market-amount" placeholder="0.00" step="0.01" min="0.01">
                        </div>
                        <div class="trade-buttons">
                            <button class="market-buy-btn">Market Buy WC</button>
                            <button class="market-sell-btn">Market Sell WC</button>
                        </div>
                    </div>
                </div>
                
                <div class="limit-orders">
                    <h3>Limit Orders (Add Liquidity)</h3>
                    <div class="limit-controls">
                        <div class="limit-inputs">
                            <div class="input-group">
                                <label for="limit-amount">Amount (WC)</label>
                                <input type="number" id="limit-amount" placeholder="0.00" step="0.01" min="0.01">
                            </div>
                            <div class="input-group">
                                <label for="limit-price">Price (WC/sat)</label>
                                <input type="number" id="limit-price" placeholder="1000" step="1" min="1">
                            </div>
                        </div>
                        <div class="limit-buttons">
                            <button class="limit-buy-btn">Place Buy Order</button>
                            <button class="limit-sell-btn">Place Sell Order</button>
                        </div>
                    </div>
                </div>

                <div class="my-orders-section">
                    <h3>My Orders</h3>
                    <div id="my-orders-list">
                        <!-- User's orders will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        this.showOrderBookToggle();
        this.showTradeHistoryToggle();
        this.showAdminToggle();
        this.refreshMyOrders();
    },
    
    /**
     * Hide market trading section
     */
    hideMarketSection() {
        document.getElementById('market-section').style.display = 'none';
        document.getElementById('order-book-section').style.display = 'none';
        document.getElementById('trade-history-section').style.display = 'none';
        document.getElementById('admin-panel-section').style.display = 'none';
    },
    
    /**
     * Show order book toggle
     */
    showOrderBookToggle() {
        const orderBookSection = document.getElementById('order-book-section');
        orderBookSection.style.display = 'block';
        orderBookSection.innerHTML = `
            <div class="order-book-toggle">
                <button class="toggle-btn">Toggle Order Book</button>
            </div>
            <div id="order-book-content" style="display: none;">
                <table class="order-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount (WC)</th>
                            <th>Price (WC/sat)</th>
                            <th>Total (BTC)</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="order-book-tbody">
                        <!-- Orders will be populated here -->
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Show trade history toggle
     */
    showTradeHistoryToggle() {
        const tradeHistorySection = document.getElementById('trade-history-section');
        tradeHistorySection.style.display = 'block';
        tradeHistorySection.innerHTML = `
            <div class="trade-history-toggle">
                <button class="toggle-trades-btn">Toggle Trade History</button>
            </div>
            <div id="trade-history-content" style="display: none;">
                <table class="trade-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Type</th>
                            <th>Amount (WC)</th>
                            <th>Price (WC/sat)</th>
                            <th>Total (BTC)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="trade-history-tbody">
                        <!-- Trades will be populated here -->
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Show admin panel toggle
     */
    showAdminToggle() {
        const adminSection = document.getElementById('admin-panel-section');
        adminSection.style.display = 'block';
        adminSection.innerHTML = `
            <div class="admin-toggle">
                <button class="toggle-admin-btn">🔧 Toggle Admin Panel</button>
            </div>
            <div id="admin-panel-content" style="display: none;">
                <div class="admin-header">
                    <h2>🔧 Admin Panel - Complete Database View</h2>
                    <button class="refresh-admin-btn">🔄 Refresh</button>
                    <label style="margin-left: 1rem;">
                        <input type="checkbox" id="auto-refresh-admin"> Auto-refresh (3s)
                    </label>
                </div>
                
                <div class="admin-section">
                    <h3>📋 All Orders</h3>
                    <div id="admin-orders-count"></div>
                    <div style="overflow-x: auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Price (WC/sat)</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody id="admin-orders-tbody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="admin-section">
                    <h3>💰 My Trades</h3>
                    <p style="font-size: 0.9em; color: #666; margin: 0;">Note: Due to database security, only trades involving the current user are shown</p>
                    <div id="admin-trades-count"></div>
                    <div style="overflow-x: auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Buyer</th>
                                    <th>Seller</th>
                                    <th>Amount</th>
                                    <th>Price (WC/sat)</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody id="admin-trades-tbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Toggle order book visibility
     */
    toggleOrderBook() {
        const content = document.getElementById('order-book-content');
        const section = document.getElementById('order-book-section');
        
        AppState.orderBookVisible = !AppState.orderBookVisible;
        
        if (AppState.orderBookVisible) {
            section.style.display = 'block';
            content.style.display = 'block';
            this.refreshOrderBook();
        } else {
            content.style.display = 'none';
        }
    },

    /**
     * Toggle trade history visibility
     */
    toggleTradeHistory() {
        const content = document.getElementById('trade-history-content');
        const section = document.getElementById('trade-history-section');
        
        AppState.tradeHistoryVisible = !AppState.tradeHistoryVisible;
        
        if (AppState.tradeHistoryVisible) {
            section.style.display = 'block';
            content.style.display = 'block';
            this.refreshTradeHistory();
        } else {
            content.style.display = 'none';
        }
    },

    /**
     * Refresh trade history display
     */
    async refreshTradeHistory() {
        try {
            const { data: trades, error } = await supabase
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20); // Show last 20 trades
            
            if (error) throw error;
            
            const tbody = document.getElementById('trade-history-tbody');
            if (!trades || trades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No trades yet</td></tr>';
                return;
            }

            tbody.innerHTML = trades.map(trade => {
                const isUserTrade = AppState.isAuthenticated && 
                    (trade.buyer_id === AppState.user.id || trade.seller_id === AppState.user.id);
                const tradeType = trade.buyer_id === AppState.user.id ? 'BUY' : 
                    trade.seller_id === AppState.user.id ? 'SELL' : 'OTHER';
                const priceWcPerSat = Math.round(trade.amount_wc / (trade.total_btc * 100000000));
                
                return `
                    <tr class="${isUserTrade ? 'user-trade' : ''}">
                        <td>${new Date(trade.created_at).toLocaleString()}</td>
                        <td>${tradeType}</td>
                        <td>${Utils.formatCurrency(trade.amount_wc, 'WC')}</td>
                        <td>${Utils.formatCurrency(priceWcPerSat, 'WC_PER_SAT')}</td>
                        <td>${Utils.formatCurrency(trade.total_btc, 'BTC')}</td>
                        <td>${trade.status}</td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            Utils.showNotification(`Failed to load trade history: ${error.message}`, 'error');
        }
    },

    /**
     * Refresh user's orders display
     */
    async refreshMyOrders() {
        try {
            if (!AppState.isAuthenticated) {
                document.getElementById('my-orders-list').innerHTML = '<p>Please sign in to view your orders</p>';
                return;
            }

            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', AppState.user.id)
                .eq('status', 'open')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const ordersList = document.getElementById('my-orders-list');
            if (!orders || orders.length === 0) {
                ordersList.innerHTML = '<p>No active orders</p>';
                return;
            }

            ordersList.innerHTML = orders.map(order => `
                <div class="my-order-item">
                    <div class="order-details">
                        <span class="order-type ${order.type}">${order.type.toUpperCase()}</span>
                        <span class="order-amount">${Utils.formatCurrency(order.amount_wc, 'WC')}</span>
                        <span class="order-price">at ${Utils.formatCurrency(Utils.btcPriceToWcPerSat(order.price_btc), 'WC_PER_SAT')}</span>
                        <span class="order-total">(${Utils.formatCurrency(order.amount_wc * order.price_btc, 'BTC')})</span>
                    </div>
                    <div class="order-actions">
                        <button class="cancel-order-btn" data-order-id="${order.id}">Cancel</button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            Utils.showNotification(`Failed to load your orders: ${error.message}`, 'error');
        }
    },

    /**
     * Toggle admin panel visibility
     */
    toggleAdminPanel() {
        const content = document.getElementById('admin-panel-content');
        const section = document.getElementById('admin-panel-section');
        
        AppState.adminPanelVisible = !AppState.adminPanelVisible;
        
        if (AppState.adminPanelVisible) {
            section.style.display = 'block';
            content.style.display = 'block';
            this.refreshAdminData();
        } else {
            content.style.display = 'none';
        }
    },

    /**
     * Refresh admin panel data
     */
    async refreshAdminData() {
        try {
            // Load all orders
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (ordersError) throw ordersError;
            
            const ordersCount = document.getElementById('admin-orders-count');
            const ordersTbody = document.getElementById('admin-orders-tbody');
            
            ordersCount.innerHTML = `<p><strong>Total Orders:</strong> ${orders?.length || 0}</p>`;
            
            if (!orders || orders.length === 0) {
                ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
            } else {
                ordersTbody.innerHTML = orders.map(order => {
                    const statusClass = order.status === 'open' ? 'status-open' : 
                                      order.status === 'matched' ? 'status-matched' : 'status-cancelled';
                    return `
                        <tr class="${statusClass}">
                            <td>${order.id.slice(0, 8)}...</td>
                            <td>${order.user_id.slice(0, 8)}...</td>
                            <td><strong>${order.type.toUpperCase()}</strong></td>
                            <td>${order.amount_wc} WC</td>
                            <td>${Utils.btcPriceToWcPerSat(order.price_btc)}</td>
                            <td><strong>${order.status}</strong></td>
                            <td>${new Date(order.created_at).toLocaleTimeString()}</td>
                        </tr>
                    `;
                }).join('');
            }

            // Load all trades (note: RLS limits to user's own trades, so this shows user's perspective)
            const { data: trades, error: tradesError } = await supabase
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (tradesError) throw tradesError;
            
            const tradesCount = document.getElementById('admin-trades-count');
            const tradesTbody = document.getElementById('admin-trades-tbody');
            
            tradesCount.innerHTML = `<p><strong>Total Trades:</strong> ${trades?.length || 0}</p>`;
            
            if (!trades || trades.length === 0) {
                tradesTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No trades found</td></tr>';
            } else {
                tradesTbody.innerHTML = trades.map(trade => {
                    const priceWcPerSat = Math.round(trade.amount_wc / (trade.total_btc * 100000000));
                    return `
                        <tr>
                            <td>${trade.id.slice(0, 8)}...</td>
                            <td>${trade.buyer_id.slice(0, 8)}...</td>
                            <td>${trade.seller_id.slice(0, 8)}...</td>
                            <td>${trade.amount_wc} WC</td>
                            <td>${priceWcPerSat}</td>
                            <td><strong>${trade.status}</strong></td>
                            <td>${new Date(trade.created_at).toLocaleTimeString()}</td>
                        </tr>
                    `;
                }).join('');
            }
            
        } catch (error) {
            Utils.showNotification(`Failed to load admin data: ${error.message}`, 'error');
        }
    },
    
    /**
     * Handle market buy button click
     */
    handleMarketBuy() {
        const amount = document.getElementById('market-amount').value;
        if (amount) {
            Market.marketBuy(amount);
        } else {
            Utils.showNotification('Please enter an amount', 'warning');
        }
    },
    
    /**
     * Handle market sell button click
     */
    handleMarketSell() {
        const amount = document.getElementById('market-amount').value;
        if (amount) {
            Market.marketSell(amount);
        } else {
            Utils.showNotification('Please enter an amount', 'warning');
        }
    },

    /**
     * Handle limit buy button click
     */
    handleLimitBuy() {
        const amount = document.getElementById('limit-amount').value;
        const price = document.getElementById('limit-price').value;
        
        if (amount && price) {
            Market.placeLimitOrder('buy', amount, price);
        } else {
            Utils.showNotification('Please enter both amount and price', 'warning');
        }
    },

    /**
     * Handle limit sell button click
     */
    handleLimitSell() {
        const amount = document.getElementById('limit-amount').value;
        const price = document.getElementById('limit-price').value;
        
        if (amount && price) {
            Market.placeLimitOrder('sell', amount, price);
        } else {
            Utils.showNotification('Please enter both amount and price', 'warning');
        }
    },
    
    /**
     * Refresh order book display
     */
    async refreshOrderBook() {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const tbody = document.getElementById('order-book-tbody');
            tbody.innerHTML = orders.map(order => {
                const isUserOrder = AppState.isAuthenticated && order.user_id === AppState.user.id;
                const cancelButton = isUserOrder && order.status === 'open' 
                    ? `<button class="cancel-order-btn" data-order-id="${order.id}">Cancel</button>`
                    : '-';
                
                return `
                    <tr class="${order.type}-order ${isUserOrder ? 'user-order' : ''}">
                        <td>${order.type.toUpperCase()}</td>
                        <td>${Utils.formatCurrency(order.amount_wc, 'WC')}</td>
                        <td>${Utils.formatCurrency(Utils.btcPriceToWcPerSat(order.price_btc), 'WC_PER_SAT')}</td>
                        <td>${Utils.formatCurrency(order.amount_wc * order.price_btc, 'BTC')}</td>
                        <td>${order.status}</td>
                        <td>${cancelButton}</td>
                    </tr>
                `;
            }).join('');
            
            // Update current price
            AppState.currentPrice = Market.calculateMarketPrice(orders);
            const priceElement = document.getElementById('current-price');
            if (priceElement) {
                priceElement.textContent = AppState.currentPrice 
                    ? Utils.formatCurrency(Utils.btcPriceToWcPerSat(AppState.currentPrice), 'WC_PER_SAT')
                    : 'No Liquidity';
            }
            
        } catch (error) {
            Utils.showNotification(`Failed to load order book: ${error.message}`, 'error');
        }
    },

    /**
     * Update market price display only
     */
    async updateMarketPrice() {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'open');
            
            if (error) throw error;
            
            // Update current price
            AppState.currentPrice = Market.calculateMarketPrice(orders);
            const priceElement = document.getElementById('current-price');
            if (priceElement) {
                priceElement.textContent = AppState.currentPrice 
                    ? Utils.formatCurrency(Utils.btcPriceToWcPerSat(AppState.currentPrice), 'WC_PER_SAT')
                    : 'No Liquidity';
            }
            
        } catch (error) {
            console.error('Failed to update market price:', error);
        }
    }
};

/**
 * Application Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    // Skip initialization in test mode
    if (window.TEST_MODE) {
        console.log('🧪 Test mode detected - skipping UI initialization');
        return;
    }
    
    // Initialize UI
    UI.init();
    
    // Setup auth state monitoring
    Auth.onAuthStateChange((event, session) => {
        UI.renderAuthSection();
        
        if (session) {
            // Update market price when user signs in
            UI.updateMarketPrice();
            
            // Refresh order book if it's visible
            if (AppState.orderBookVisible) {
                UI.refreshOrderBook();
            }
        }
    });
    
    // Setup real-time subscriptions if authenticated
    if (AppState.isAuthenticated) {
        // Subscribe to order changes
        supabase
            .channel('orders')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    // Always update market price
                    UI.updateMarketPrice();
                    
                    // Update order book if visible
                    if (AppState.orderBookVisible) {
                        UI.refreshOrderBook();
                    }
                }
            )
            .subscribe();
    }
    
    Utils.showNotification('WBX Exchange loaded successfully!', 'success');
});