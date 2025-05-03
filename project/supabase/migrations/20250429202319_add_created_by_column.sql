/*
  Add created_by column to all transaction tables
  This migration adds a created_by column to track the email of the user who created the transaction
  for sales, purchases, transfers, bank_transfers, and expenses tables.
*/

-- Add created_by column to sales table if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by column to purchases table if it doesn't exist
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by column to transfers table if it doesn't exist
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by column to bank_transfers table if it doesn't exist
ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by column to expenses table if it doesn't exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Update existing records to use username as created_by if it exists
UPDATE sales SET created_by = username WHERE created_by IS NULL AND username IS NOT NULL;
UPDATE purchases SET created_by = username WHERE created_by IS NULL AND username IS NOT NULL;
UPDATE transfers SET created_by = username WHERE created_by IS NULL AND username IS NOT NULL;
UPDATE bank_transfers SET created_by = username WHERE created_by IS NULL AND username IS NOT NULL;
UPDATE expenses SET created_by = username WHERE created_by IS NULL AND username IS NOT NULL; 