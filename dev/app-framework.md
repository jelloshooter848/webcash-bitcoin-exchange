# Technical Framework for WBX: WebCash-Bitcoin Exchange

## Purpose
This document provides detailed technical framework and implementation guidance for WBX (WebCash-Bitcoin Exchange). It serves as a reference for architecture decisions, algorithms, and implementation details to guide development.

## High-Level Requirements

### User Experience Goals
Users see a current market price (derived from order book) and can instantly "Buy WC" or "Sell WC" at that price with one click. No manual order posting for basic trades; advanced users can view/post limit orders optionally.

### Functionality Requirements
- **Authentication**: Email/password sign-up/login with JWT tokens
- **Market Trading**: Instant buy/sell execution by auto-filling from existing limit orders
- **Order Book Management**: Real-time table of buys/sells with live updates
- **Settlement System**: Non-custodial P2P settlements (BTC wallet sends, WC secret pastes)

### Non-Functional Requirements
- **Resilience**: Serverless Supabase architecture for auto-scaling
- **Security**: JWT auth, encrypted transit, input validation, no fund custody
- **Performance**: Real-time matching on DB changes, efficient partial fills
- **Scalability**: PostgreSQL for efficient order queries and joins

## System Architecture

### Frontend Architecture
Single-page application in vanilla JavaScript with modular object-oriented design:
- **AppState**: Global application state management
- **Auth**: Authentication and user management
- **Market**: Trading logic and price calculations
- **UI**: User interface management and event handling

### Backend Architecture
Supabase provides complete backend infrastructure:
- **Database**: PostgreSQL with optimized schemas for trading
- **Authentication**: Built-in JWT-based auth system
- **Real-time**: WebSocket subscriptions for live updates
- **Edge Functions**: Optional server-side logic for complex operations

### External Integrations
- **WebCash API**: Secret validation via health_check endpoint
- **Bitcoin API**: Transaction confirmation via BlockCypher or similar
- **Real-time subscriptions**: Live order book updates

### Data Flow Diagram
```
User Action → JavaScript Handler → Supabase SDK → Database Update
     ↓                                              ↓
UI Update ← Real-time Subscription ← Postgres Change Notification
```

## Data Models

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('buy', 'sell')),
  amount_wc NUMERIC NOT NULL,
  price_btc NUMERIC NOT NULL,
  btc_address TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'settled', 'canceled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Trades Table
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  amount_wc NUMERIC NOT NULL,
  total_btc NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
);
```

## Core Algorithms and Logic

### Market Price Calculation
**Purpose**: Determine current market price from order book
**Implementation**: 
1. Query open buy orders (sorted DESC by price)
2. Query open sell orders (sorted ASC by price)
3. Calculate mid-price = (best_buy + best_sell) / 2
4. Return null if no liquidity on either side
**Complexity**: O(log n) with proper indexing

### Market Order Execution
**Purpose**: Execute instant buy/sell orders against existing limit orders
**Implementation**:
1. For buy orders: Sort open sells ASC by price, fill from cheapest
2. For sell orders: Sort open buys DESC by price, fill from highest
3. Loop through orders, calculate partial fills
4. Update order amounts or mark as matched
5. Create trade records for settlements
**Complexity**: O(n) for order matching, O(log n) for sorted retrieval

## UI Components

### Authentication Component
**Purpose**: Handle user sign-up, sign-in, and authentication state
**Layout**: Email/password inputs with sign-up/sign-in buttons
**Interactions**: Form validation, error display, state management

### Market Trading Component
**Purpose**: Display current price and execute market orders
**Layout**: Price display, amount input, buy/sell buttons
**Interactions**: Real-time price updates, order execution, validation

### Order Book Component
**Purpose**: Display live order book with buy/sell orders
**Layout**: Sortable table with type, amount, price, status columns
**Interactions**: Toggle visibility, real-time updates, responsive design

## Proposed Code Structure

```
webcash-bitcoin-exchange/
├── index.html              # Main HTML structure
├── styles.css              # Responsive CSS styles
├── app.js                  # Core application logic
├── supabase-config.js      # Supabase client setup
└── utils/
    └── api-helpers.js      # External API integrations
```

### Key File Responsibilities
- **app.js**: Authentication, market logic, UI management, real-time subscriptions
- **supabase-config.js**: Database client configuration and connection
- **utils/api-helpers.js**: WebCash and Bitcoin API integrations, utility functions

## Implementation Guidelines

### Coding Standards
- Vanilla JavaScript with ES6+ features
- Modular object-oriented design pattern
- Consistent error handling and user feedback
- Responsive mobile-first CSS approach

### Security Considerations
- No fund custody - all settlements are P2P
- Input validation on all user inputs
- JWT token management via Supabase
- HTTPS required for production deployment

### Performance Optimization
- Efficient DOM manipulation and updates
- Debounced real-time subscription handling
- Optimized database queries with proper indexing
- Minimal JavaScript bundle size

### Error Handling
- Comprehensive try-catch blocks for async operations
- User-friendly error messages via notification system
- Graceful degradation for API failures
- Rollback mechanisms for partial order executions

## Testing Strategy

### Unit Testing
- Market price calculation accuracy
- Order matching algorithm correctness
- Input validation functions
- Currency formatting utilities

### Integration Testing
- Supabase database operations
- Real-time subscription handling
- Authentication flow validation
- External API integrations

### End-to-End Testing
- Complete user registration and login flow
- Market order execution from UI to database
- Order book real-time updates
- Settlement process validation

## Deployment and Infrastructure

### Development Environment
- Local HTTP server for static file serving
- Supabase local development environment
- Browser developer tools for debugging
- Version control with Git

### Production Environment
- Static hosting on Vercel/Netlify/GitHub Pages
- Supabase cloud infrastructure
- Custom domain with SSL/TLS
- CDN for global performance

### CI/CD Pipeline
- Git-based deployment triggers
- Automated testing on push
- Environment variable management
- Rollback capabilities

### Monitoring and Logging
- Supabase built-in monitoring
- Browser console error tracking
- User activity analytics
- Performance metrics collection

## API Documentation

### Supabase Operations
```javascript
// Authentication
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })

// Database queries
await supabase.from('orders').select('*').eq('status', 'open')
await supabase.from('orders').insert({ user_id, type, amount_wc, price_btc })

// Real-time subscriptions
supabase.channel('orders').on('postgres_changes', handler).subscribe()
```

### External API Integration
- WebCash API: POST /health_check for secret validation
- Bitcoin API: GET /txs/{hash} for transaction confirmation
- Address validation via regex patterns

## Configuration Management

### Environment Variables
- SUPABASE_URL: Project URL from Supabase dashboard
- SUPABASE_ANON_KEY: Public API key for client-side operations
- WEBCASH_API_URL: WebCash server endpoint
- BITCOIN_API_URL: Bitcoin blockchain API endpoint

### Feature Flags
- Order book visibility toggle
- Real-time subscription enable/disable
- Development mode indicators
- API endpoint switching

### Secrets Management
- Supabase handles JWT token security
- No sensitive keys in client-side code
- Environment-specific configuration
- Secure API key rotation

## Troubleshooting Guide

### Common Issues
- **Authentication failures**: Check Supabase project settings and email confirmation
- **Real-time updates not working**: Verify WebSocket connection and subscription setup
- **Order execution errors**: Validate database schema and permission settings
- **API integration failures**: Check external service availability and rate limits

### Debug Procedures
1. Check browser console for JavaScript errors
2. Verify Supabase connection and authentication status
3. Test database queries in Supabase dashboard
4. Validate API responses and error handling

### Performance Monitoring
- Monitor real-time subscription performance
- Track database query execution times
- Analyze user interaction patterns
- Measure page load and response times