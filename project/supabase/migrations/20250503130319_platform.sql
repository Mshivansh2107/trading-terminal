-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read platforms"
  ON platforms
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert/update/delete platforms"
  ON platforms
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT auth.uid() FROM auth.users WHERE auth.uid() = auth.uid()));

-- Insert default platforms
INSERT INTO platforms (name, description, is_active)
VALUES
  ('BINANCE SS', 'Binance Spot Selling', true),
  ('BINANCE AS', 'Binance Arbitrage Selling', true),
  ('BYBIT SS', 'Bybit Spot Selling', true),
  ('BYBIT AS', 'Bybit Arbitrage Selling', true),
  ('BITGET SS', 'Bitget Spot Selling', true),
  ('BITGET AS', 'Bitget Arbitrage Selling', true),
  ('KUCOIN SS', 'KuCoin Spot Selling', true),
  ('KUCOIN AS', 'KuCoin Arbitrage Selling', true),
  ('ADJUSTMENT', 'Used for stock balance adjustments', true)
ON CONFLICT (name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS platforms_name_idx ON platforms(name);
