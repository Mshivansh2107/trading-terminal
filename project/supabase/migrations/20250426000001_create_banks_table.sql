-- Create a banks table
CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read banks
CREATE POLICY "Users can read banks"
  ON banks
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert, update, delete banks (in production you may want to restrict this to admins)
CREATE POLICY "Users can manage banks"
  ON banks
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert the existing banks
INSERT INTO banks (name, description, is_active)
VALUES
  ('IDBI', 'IDBI Bank', true),
  ('INDUSIND SS', 'IndusInd Bank SS', true),
  ('HDFC CAA SS', 'HDFC CAA SS', true),
  ('BOB SS', 'Bank of Baroda SS', true),
  ('CANARA SS', 'Canara Bank SS', true),
  ('HDFC SS', 'HDFC Bank SS', true),
  ('INDUSIND BLYNK', 'IndusInd Bank BLYNK', true),
  ('PNB', 'Punjab National Bank', true)
ON CONFLICT (name) DO NOTHING;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS banks_name_idx ON banks(name);
CREATE INDEX IF NOT EXISTS banks_is_active_idx ON banks(is_active); 