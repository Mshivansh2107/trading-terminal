-- Create settings table for global application settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Users can read settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update settings
CREATE POLICY "Users can update settings"
  ON settings
  FOR UPDATE
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert settings
CREATE POLICY "Users can insert settings"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for key lookups
CREATE INDEX IF NOT EXISTS settings_key_idx ON settings(key);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('trading_settings', '{
    "requiredMargin": 3,
    "currentUsdPrice": 0,
    "salesPriceRange": 0,
    "buyPriceUsdt": 0,
    "lastUsdtPriceUpdate": null
  }'::jsonb)
ON CONFLICT (key) DO NOTHING; 