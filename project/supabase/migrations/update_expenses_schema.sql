/*
  Update expenses table schema

  This migration ensures the expenses table has all necessary fields:
  - Adds created_by column if missing
  - Makes category column nullable
  - Adds updated_at and edited_by columns if missing
*/

-- Update expenses table schema
DO $$
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN created_by text;
        RAISE NOTICE 'Added created_by column to expenses table';
    END IF;
    
    -- Make category column nullable
    BEGIN
        ALTER TABLE public.expenses ALTER COLUMN category DROP NOT NULL;
        RAISE NOTICE 'Made category column nullable in expenses table';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Category column is already nullable or does not exist';
    END;
    
    -- Add edited_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'edited_by'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN edited_by text;
        RAISE NOTICE 'Added edited_by column to expenses table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN updated_at timestamptz;
        RAISE NOTICE 'Added updated_at column to expenses table';
    END IF;
END
$$; 