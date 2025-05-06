-- Add required columns to bank_transfers table if they don't exist
ALTER TABLE bank_transfers 
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS edited_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update existing records to have a default value for created_by if it's NULL
UPDATE bank_transfers 
SET created_by = username 
WHERE created_by IS NULL AND username IS NOT NULL;

-- For any remaining records without created_by, set a default value
UPDATE bank_transfers 
SET created_by = 'System Migration' 
WHERE created_by IS NULL;

-- Display message confirming the changes
SELECT 'Bank transfers table updated successfully.' AS message; 