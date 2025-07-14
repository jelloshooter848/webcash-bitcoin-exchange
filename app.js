// WBX Exchange - Main Application Logic

/**
 * Application State
 */
const AppState = {
    user: null,
    currentPrice: null,
    orders: [],
    isAuthenticated: false,
    orderBookVisible: false
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
        const buyOrders = openOrders.filter(order => order.type === 'buy').sort((a, b) => b.price_btc - a.price_btc);
        const sellOrders = openOrders.filter(order => order.type === 'sell').sort((a, b) => a.price_btc - b.price_btc);
        
        if (buyOrders.length === 0 || sellOrders.length === 0) {
            return null; // No liquidity
        }
        
        const bestBuy = buyOrders[0].price_btc;
        const bestSell = sellOrders[0].price_btc;
        
        return (bestBuy + bestSell) / 2;
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
                
                const fillAmount = Math.min(remainingAmount, order.amount_wc);
                const fillTotal = fillAmount * order.price_btc;
                
                fills.push({
                    orderId: order.id,
                    amount: fillAmount,
                    price: order.price_btc,
                    total: fillTotal
                });
                
                remainingAmount -= fillAmount;
                totalBTC += fillTotal;
            }
            
            if (remainingAmount > 0) {
                throw new Error('Insufficient liquidity for full order');
            }
            
            // TODO: Execute the fills in database transaction
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
                
                const fillAmount = Math.min(remainingAmount, order.amount_wc);
                const fillTotal = fillAmount * order.price_btc;
                
                fills.push({
                    orderId: order.id,
                    amount: fillAmount,
                    price: order.price_btc,
                    total: fillTotal
                });
                
                remainingAmount -= fillAmount;
                totalBTC += fillTotal;
            }
            
            if (remainingAmount > 0) {
                throw new Error('Insufficient liquidity for full order');
            }
            
            // TODO: Execute the fills in database transaction
            Utils.showNotification(`Market sell executed: ${amountWC} WC for ${Utils.formatCurrency(totalBTC, 'BTC')}`, 'success');
            
        } catch (error) {
            Utils.showNotification(`Market sell failed: ${error.message}`, 'error');
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
        
        // Market trade buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('buy-btn')) {
                this.handleMarketBuy();
            } else if (e.target.classList.contains('sell-btn')) {
                this.handleMarketSell();
            } else if (e.target.classList.contains('toggle-btn')) {
                this.toggleOrderBook();
            } else if (e.target.classList.contains('sign-out-btn')) {
                Auth.signOut();
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
                    ${AppState.currentPrice ? Utils.formatCurrency(AppState.currentPrice, 'BTC') + '/WC' : 'No Liquidity'}
                </div>
            </div>
            <div class="trade-controls">
                <div class="trade-input">
                    <label for="trade-amount">WebCash Amount</label>
                    <input type="number" id="trade-amount" placeholder="0.00" step="0.01" min="0.01">
                </div>
                <div class="trade-buttons">
                    <button class="buy-btn">Buy WC</button>
                    <button class="sell-btn">Sell WC</button>
                </div>
            </div>
        `;
        
        this.showOrderBookToggle();
    },
    
    /**
     * Hide market trading section
     */
    hideMarketSection() {
        document.getElementById('market-section').style.display = 'none';
        document.getElementById('order-book-section').style.display = 'none';
    },
    
    /**
     * Show order book toggle
     */
    showOrderBookToggle() {
        const orderBookSection = document.getElementById('order-book-section');
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
                            <th>Price (BTC)</th>
                            <th>Total (BTC)</th>
                            <th>Status</th>
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
     * Handle market buy button click
     */
    handleMarketBuy() {
        const amount = document.getElementById('trade-amount').value;
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
        const amount = document.getElementById('trade-amount').value;
        if (amount) {
            Market.marketSell(amount);
        } else {
            Utils.showNotification('Please enter an amount', 'warning');
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
            tbody.innerHTML = orders.map(order => `
                <tr class="${order.type}-order">
                    <td>${order.type.toUpperCase()}</td>
                    <td>${Utils.formatCurrency(order.amount_wc, 'WC')}</td>
                    <td>${Utils.formatCurrency(order.price_btc, 'BTC')}</td>
                    <td>${Utils.formatCurrency(order.amount_wc * order.price_btc, 'BTC')}</td>
                    <td>${order.status}</td>
                </tr>
            `).join('');
            
            // Update current price
            AppState.currentPrice = Market.calculateMarketPrice(orders);
            const priceElement = document.getElementById('current-price');
            if (priceElement) {
                priceElement.textContent = AppState.currentPrice 
                    ? Utils.formatCurrency(AppState.currentPrice, 'BTC') + '/WC'
                    : 'No Liquidity';
            }
            
        } catch (error) {
            Utils.showNotification(`Failed to load order book: ${error.message}`, 'error');
        }
    }
};

/**
 * Application Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    UI.init();
    
    // Setup auth state monitoring
    Auth.onAuthStateChange((event, session) => {
        UI.renderAuthSection();
        
        if (session && AppState.orderBookVisible) {
            UI.refreshOrderBook();
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
                    if (AppState.orderBookVisible) {
                        UI.refreshOrderBook();
                    }
                }
            )
            .subscribe();
    }
    
    Utils.showNotification('WBX Exchange loaded successfully!', 'success');
});