/*
  # Create beneficiaries table for CRM functionality

  1. New Tables
    - `beneficiaries`
      - `id` (uuid, primary key)
      - `name` (text)
      - `contact_no` (text)
      - `government_id` (text, optional)
      - `risk_level` (text) - 'low', 'medium', 'high', 'critical'
      - `assigned_bank` (text, optional)
      - `files` (jsonb) - array of file objects
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz, optional)
      - `created_by` (text)
      - `edited_by` (text, optional)

  2. Security
    - Enable RLS on beneficiaries table
    - Add policies for authenticated users to manage beneficiaries

  3. Updates to existing tables
    - Add beneficiary_id column to sales and purchases tables
*/

-- Create beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_no text NOT NULL,
  government_id text,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  assigned_bank text,
  files jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by text NOT NULL,
  edited_by text
);

-- Enable RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can read beneficiaries"
  ON beneficiaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert beneficiaries"
  ON beneficiaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update beneficiaries"
  ON beneficiaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete beneficiaries"
  ON beneficiaries
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add beneficiary_id column to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'beneficiary_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN beneficiary_id uuid REFERENCES beneficiaries(id);
  END IF;
END $$;

-- Add beneficiary_id column to purchases table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'beneficiary_id'
  ) THEN
    ALTER TABLE purchases ADD COLUMN beneficiary_id uuid REFERENCES beneficiaries(id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS beneficiaries_name_idx ON beneficiaries(name);
CREATE INDEX IF NOT EXISTS beneficiaries_risk_level_idx ON beneficiaries(risk_level);
CREATE INDEX IF NOT EXISTS sales_beneficiary_id_idx ON sales(beneficiary_id);
CREATE INDEX IF NOT EXISTS purchases_beneficiary_id_idx ON purchases(beneficiary_id);