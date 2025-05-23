/*
  # Initial Schema Setup for Trading Terminal

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `order_number` (text)
      - `bank` (text)
      - `order_type` (text)
      - `asset_type` (text)
      - `fiat_type` (text)
      - `total_price` (numeric)
      - `price` (numeric)
      - `quantity` (numeric)
      - `platform` (text)
      - `name` (text)
      - `contact_no` (text, optional)
      - `user_id` (text, optional)
      - `username` (text, optional)
      - `created_at` (timestamptz)

    - `purchases`
      - `id` (uuid, primary key)
      - `order_number` (text)
      - `bank` (text)
      - `order_type` (text)
      - `asset_type` (text)
      - `fiat_type` (text)
      - `total_price` (numeric)
      - `price` (numeric)
      - `quantity` (numeric)
      - `platform` (text)
      - `name` (text)
      - `contact_no` (text, optional)
      - `user_id` (text, optional)
      - `username` (text, optional)
      - `created_at` (timestamptz)

    - `transfers`
      - `id` (uuid, primary key)
      - `from_platform` (text)
      - `to_platform` (text)
      - `quantity` (numeric)
      - `user_id` (text, optional)
      - `username` (text, optional)
      - `created_at` (timestamptz)

    - `bank_transfers`
      - `id` (uuid, primary key)
      - `from_bank` (text)
      - `from_account` (text)
      - `to_bank` (text)
      - `to_account` (text)
      - `amount` (numeric)
      - `reference` (text, optional)
      - `user_id` (text, optional)
      - `username` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
*/

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  bank text NOT NULL,
  order_type text NOT NULL,
  asset_type text NOT NULL,
  fiat_type text NOT NULL,
  total_price numeric NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  platform text NOT NULL,
  name text NOT NULL,
  contact_no text,
  user_id text,
  username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sales data"
  ON sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own sales data"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  bank text NOT NULL,
  order_type text NOT NULL,
  asset_type text NOT NULL,
  fiat_type text NOT NULL,
  total_price numeric NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  platform text NOT NULL,
  name text NOT NULL,
  contact_no text,
  user_id text,
  username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases data"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own purchases data"
  ON purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_platform text NOT NULL,
  to_platform text NOT NULL,
  quantity numeric NOT NULL,
  user_id text,
  username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transfers data"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own transfers data"
  ON transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create bank_transfers table for bank-to-bank transfers
CREATE TABLE IF NOT EXISTS bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_bank text NOT NULL,
  from_account text NOT NULL,
  to_bank text NOT NULL,
  to_account text NOT NULL,
  amount numeric NOT NULL,
  reference text,
  user_id text,
  username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bank transfers data"
  ON bank_transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own bank transfers data"
  ON bank_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales(created_at);
CREATE INDEX IF NOT EXISTS purchases_created_at_idx ON purchases(created_at);
CREATE INDEX IF NOT EXISTS transfers_created_at_idx ON transfers(created_at);
CREATE INDEX IF NOT EXISTS bank_transfers_created_at_idx ON bank_transfers(created_at);