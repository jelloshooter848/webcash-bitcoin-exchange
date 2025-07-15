-- WBX Exchange Database Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Orders table for buy/sell orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount_wc NUMERIC(20,8) NOT NULL CHECK (amount_wc > 0),
  price_btc NUMERIC(20,8) NOT NULL CHECK (price_btc > 0),
  btc_address TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'settled', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trades table for matched transactions
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_wc NUMERIC(20,8) NOT NULL CHECK (amount_wc > 0),
  total_btc NUMERIC(20,8) NOT NULL CHECK (total_btc > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_type_status_idx ON orders(type, status);
CREATE INDEX orders_price_btc_idx ON orders(price_btc);
CREATE INDEX orders_created_at_idx ON orders(created_at);

CREATE INDEX trades_buyer_id_idx ON trades(buyer_id);
CREATE INDEX trades_seller_id_idx ON trades(seller_id);
CREATE INDEX trades_status_idx ON trades(status);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table
CREATE POLICY "Users can view all orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON orders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trades table
CREATE POLICY "Users can view their own trades" ON trades FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "System can insert trades" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own trades" ON trades FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();