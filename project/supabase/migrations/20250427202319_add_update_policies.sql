/*
key details:
  Add UPDATE policies to all transaction tables.
  This migration adds policies that allow authenticated users to update transactions.
  This supports the 'Functionality to edit any created sales purchase or transfer' requirement.

*/

-- Add update policies for sales table
CREATE POLICY "Users can update sales data"
  ON sales
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add update policies for purchases table
CREATE POLICY "Users can update purchases data"
  ON purchases
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add update policies for transfers table
CREATE POLICY "Users can update transfers data"
  ON transfers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add update policies for bank_transfers table
CREATE POLICY "Users can update bank transfers data"
  ON bank_transfers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add update policies for expenses table
CREATE POLICY "Users can update expenses data"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add updated_at and edited_by columns to all transaction tables
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS edited_by TEXT;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS edited_by TEXT;

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS edited_by TEXT;

ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS edited_by TEXT;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS edited_by TEXT; 