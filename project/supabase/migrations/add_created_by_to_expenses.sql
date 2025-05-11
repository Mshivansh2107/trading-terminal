/*
  Add created_by column to expenses table

  This migration adds:
  - `created_by` (text) to the expenses table
*/

-- Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN created_by text;
        RAISE NOTICE 'Added created_by column to expenses table';
    ELSE
        RAISE NOTICE 'created_by column already exists in expenses table';
    END IF;
END
$$; 