-- Fix missing notes column in transfers table

-- First, check if the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfers' 
        AND column_name = 'notes'
    ) THEN
        -- Add the notes column if it doesn't exist
        ALTER TABLE public.transfers ADD COLUMN notes text;
        RAISE NOTICE 'Added notes column to transfers table';
    ELSE
        RAISE NOTICE 'Notes column already exists in transfers table';
    END IF;
END
$$;

-- Force refresh the PostgREST schema cache
-- This helps Supabase recognize the new column immediately
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the column exists
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'transfers' 
    AND column_name = 'notes'; 