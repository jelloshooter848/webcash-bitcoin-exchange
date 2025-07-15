// API Helper Functions

/**
 * WebCash API Integration
 */
const WebCashAPI = {
    baseURL: 'https://webcash.org', // Replace with actual WebCash API URL
    
    /**
     * Validate a WebCash secret
     * @param {string} secret - WebCash secret to validate
     * @returns {Promise<boolean>} - True if valid
     */
    async validateSecret(secret) {
        try {
            const response = await fetch(`${this.baseURL}/health_check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ secret })
            });
            return response.ok;
        } catch (error) {
            console.error('WebCash API validation error:', error);
            return false;
        }
    }
};

/**
 * Bitcoin API Integration
 */
const BitcoinAPI = {
    baseURL: 'https://api.blockcypher.com/v1/btc/main', // Free Bitcoin API
    
    /**
     * Check transaction confirmation status
     * @param {string} txHash - Bitcoin transaction hash
     * @returns {Promise<Object>} - Transaction details
     */
    async getTransactionStatus(txHash) {
        try {
            const response = await fetch(`${this.baseURL}/txs/${txHash}`);
            if (!response.ok) throw new Error('Transaction not found');
            return await response.json();
        } catch (error) {
            console.error('Bitcoin API error:', error);
            return null;
        }
    },
    
    /**
     * Validate Bitcoin address format
     * @param {string} address - Bitcoin address to validate
     * @returns {boolean} - True if valid format
     */
    validateAddress(address) {
        // Basic Bitcoin address validation (simplified)
        const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
        return btcRegex.test(address);
    }
};

/**
 * Utility Functions
 */
const Utils = {
    /**
     * Format currency display
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency type ('BTC', 'SATS', or 'WC')
     * @returns {string} - Formatted amount
     */
    formatCurrency(amount, currency) {
        if (currency === 'BTC') {
            return `${parseFloat(amount).toFixed(8)} BTC`;
        } else if (currency === 'SATS') {
            return `${Math.round(parseFloat(amount))} sats`;
        } else if (currency === 'WC') {
            return `${parseFloat(amount).toFixed(2)} WC`;
        } else if (currency === 'WC_PER_SAT') {
            return `${Math.round(parseFloat(amount))} WC/sat`;
        }
        return amount.toString();
    },

    /**
     * Convert BTC to satoshis
     * @param {number} btc - Amount in BTC
     * @returns {number} - Amount in satoshis
     */
    btcToSats(btc) {
        return Math.round(parseFloat(btc) * 100000000);
    },

    /**
     * Convert satoshis to BTC
     * @param {number} sats - Amount in satoshis
     * @returns {number} - Amount in BTC
     */
    satsToBtc(sats) {
        return parseFloat(sats) / 100000000;
    },

    /**
     * Convert WC/sat to BTC price (for database storage)
     * @param {number} wcPerSat - Amount of WC per satoshi
     * @returns {number} - Price in BTC per WC
     */
    wcPerSatToBtcPrice(wcPerSat) {
        // If 200 WC = 1 sat, then 1 WC = 1/200 sat = 0.005 sat per WC
        // 0.005 sat = 0.005/100000000 BTC = 0.00000000005 BTC per WC
        const satsPerWc = 1 / parseFloat(wcPerSat);
        return satsPerWc / 100000000;
    },

    /**
     * Convert BTC price to WC/sat display format
     * @param {number} btcPrice - Price in BTC per WC
     * @returns {number} - Amount of WC per satoshi
     */
    btcPriceToWcPerSat(btcPrice) {
        // Convert BTC per WC to sats per WC, then invert to get WC per sat
        const satsPerWc = parseFloat(btcPrice) * 100000000;
        return Math.round(1 / satsPerWc);
    },
    
    /**
     * Show notification to user
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
     */
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    },
    
    /**
     * Validate numeric input
     * @param {string} value - Input value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {boolean} - True if valid
     */
    validateNumericInput(value, min = 0, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },
    
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Export to global scope for use in app.js
window.WebCashAPI = WebCashAPI;
window.BitcoinAPI = BitcoinAPI;
window.Utils = Utils;