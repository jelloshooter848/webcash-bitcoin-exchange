# Technical Framework for WBX: WebCash-Bitcoin Hybrid Exchange

This document provides a detailed technical framework for building WBX (WebCash-Bitcoin Exchange), a browser-based, non-custodial hybrid trading platform for WC/BTC pairs. It builds on the whitepaper's concepts but focuses on implementation details to guide manual coding in vanilla JavaScript, with Supabase as the backend. The design prioritizes simplicity for users (market buy/sell at current prices) while automating matching and maintaining resilience through P2P settlements.

This framework is formatted for clarity and compatibility with AI-assisted coding tools like ClaudeCode. Sections include high-level requirements, architecture, data models, UI components, core algorithms, code structure, and deployment notes. Use this as a blueprint: Copy-paste sections into ClaudeCode prompts (e.g., "Implement the Market Buy function based on this spec: [paste section]") to generate or refine code snippets.

## 1. High-Level Requirements

**User Experience Goals**:  
Users see a current market price (derived from order book) and can instantly "Buy WC" or "Sell WC" at that price with one click. No manual order posting for basic trades; advanced users can view/post limit orders optionally.

**Functionality**:
- **Authentication**: Email/password sign-up/login.
- **Market View**: Display real-time market price (mid-point of best bid/ask).
- **Market Trades**: Instant buy/sell execution by auto-filling from existing limit orders.
- **Order Book**: Real-time table of buys/sells (hidden by default).
- **Settlements**: Non-custodial P2P (BTC wallet sends, WC secret pastes) post-match.
- **Automation**: Real-time matching on DB changes; partial fills for market orders.

**Non-Functional**:
- **Resilience**: Serverless (Supabase) for auto-scaling; no fund custody.
- **Security**: JWT auth, encrypted transit, input validation.
- **Tech Stack**: Vanilla JS/HTML/CSS (frontend), Supabase (auth/DB/real-time).
- **Assumptions**: Low initial traffic; WC/BTC pair only; integrate WebCash/BTC APIs for verification.
- **Edge Cases**: Handle low liquidity (alert "Insufficient"), invalid inputs, logouts mid-trade.

> For ClaudeCode: `"Generate vanilla JS code for a real-time market price calculator using Supabase subscriptions, based on this requirement. Ensure it handles empty order books gracefully."`

## 2. System Architecture

**Frontend**: Single-page app (SPA-like) in browser. JS handles UI updates, API calls via Supabase SDK.  
**Backend**: Supabase (open-source BaaS):
- **Auth**: Built-in email/password with JWT.
- **Database**: PostgreSQL for relational data (efficient for order queries/joins).
- **Real-Time**: Subscriptions for live updates (e.g., on order changes, recalculate price).
- **Edge Functions**: Optional for server-side logic (e.g., complex matching if JS limits hit).

**External Integrations**:
- WebCash API: Fetch to validate secrets (e.g., `/health_check` endpoint).
- BTC Explorer API: Free like Blockcypher (fetch tx status).

**Data Flow Diagram (Text-Based for ClaudeCode)**:

```
User Browser (JS) <-> Supabase SDK <-> Supabase Cloud (DB/Auth/Subs)
                                    |
                                    v
     External: WebCash Server (Secret Validation) / BTC API (Tx Confirm)
```

> For ClaudeCode: `"Design the data flow for market buy execution: User clicks -> JS queries orders -> Fills matches -> Updates DB -> Notifies. Output as JS pseudocode."`

## 3. Data Models (Supabase Schema)

**Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);
```

**Orders Table**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('buy', 'sell')),
  amount_wc NUMERIC NOT NULL,
  price_btc NUMERIC NOT NULL,
  btc_address TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'settled', 'canceled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Trades Table**
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  amount_wc NUMERIC,
  total_btc NUMERIC,
  status TEXT DEFAULT 'pending',
  settled_at TIMESTAMP
);
```

> For ClaudeCode: `"Write Supabase JS SDK code to insert a new order into the 'orders' table, including error handling."`

## 4. UI Components

**Main Layout (index.html)**:
- Auth Form: Email/password inputs, Sign Up/In/Out buttons.
- Market Section (Default View): Current price display, WC amount input, Buy/Sell buttons.
- Order Book Toggle: Button to show/hide table (type, amount, price, status columns).
- Notifications: Alert div for matches/errors.

**Responsive Design (styles.css)**: Basic flex/grid for mobile; tables scrollable.

> For ClaudeCode: `"Create HTML snippet for the market trade section: Price span, amount input, buy/sell buttons. Add CSS for centering."`

## 5. Core Algorithms and Logic

**Market Price Calculation**:
- Query open buys (sort DESC by price), sells (sort ASC by price).
- Mid-price = (best_buy + best_sell) / 2; if none, show "No Liquidity".
- Run on subscription snapshot.

**Market Buy Execution**:
- Input: WC amount.
- Sort open sells ASC by price.
- Loop: Fill from cheapest until amount met; calculate total BTC; partial if needed.
- Update orders (reduce amounts, set 'matched' if full); create trade record.
- If incomplete: Alert and rollback partials.

**Market Sell Execution**: Symmetric (sort buys DESC, fill from highest).  
**Real-Time Handling**: Use Supabase `.subscribe()` on 'orders' for price/book updates.  
**Settlement Guidance**: Post-match, show instructions; poll BTC API for confirm; validate WC secrets.

> For ClaudeCode: `"Implement the marketBuy function in vanilla JS: Query Supabase for sells, loop fills, update DB. Handle partials and insufficient liquidity."`

## 6. Proposed Code Structure

```
wbx-exchange/
├── index.html
├── styles.css
├── app.js
├── supabase-config.js
└── utils/
    └── api-helpers.js
```

**Key app.js Outline**
```javascript
// Imports: supabase-js
// Config: from supabase-config

// Auth Functions: signUp, signIn, signOut, onAuthChange

// UI Toggles: showMarket, toggleOrderBook

// Real-Time Subscription: supabase.from('orders').select('*').subscribe((payload) => { updateBook(payload); calcPrice(payload); })

// Market Price: calculateMarketPrice(orders)

// Market Buy/Sell: marketBuy(), marketSell() // As in previous snippet

// Settlement: confirmSettlement(tradeId) // Poll APIs, update trade status
```

> For ClaudeCode: `"Expand this app.js outline into full code: Focus on marketBuy with Supabase updates."`

## 7. Testing and Deployment

- **Local Testing**: Open index.html; use Supabase local CLI for DB emulation.
- **Deployment**: Supabase Hosting or static host (e.g., Vercel); deploy via Git.
- **Security Checks**: Validate all inputs; use HTTPS.
- **Iterative Dev**: Start with auth, add market view, then executions.

> For ClaudeCode: `"Write a test script for market price calc: Mock orders array, assert mid-price."`

---

This framework provides a complete, actionable guide. Start coding core components first (auth/UI), then add market logic. If issues arise in ClaudeCode, refine prompts with specifics from here.
