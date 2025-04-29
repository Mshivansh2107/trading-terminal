-- Verify and fix tables and permissions for stock and cash management

-- Check if transfers table exists, create if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transfers') THEN
        CREATE TABLE public.transfers (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            from_platform text NOT NULL,
            to_platform text NOT NULL,
            quantity numeric NOT NULL,
            notes text,
            user_id text,
            username text,
            edited_by text,
            updated_at timestamptz,
            created_at timestamptz DEFAULT now()
        );
        
        -- Enable RLS
        ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
        
        -- Add policies
        CREATE POLICY "Users can read own transfers data"
            ON public.transfers
            FOR SELECT
            TO authenticated
            USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Users can insert own transfers data"
            ON public.transfers
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() IS NOT NULL);
            
        CREATE POLICY "Users can update own transfers data"
            ON public.transfers
            FOR UPDATE
            TO authenticated
            USING (auth.uid() IS NOT NULL);
            
        -- Create index
        CREATE INDEX IF NOT EXISTS transfers_created_at_idx ON public.transfers(created_at);
        
        RAISE NOTICE 'Created transfers table with proper permissions';
    ELSE
        RAISE NOTICE 'Transfers table already exists';
        
        -- Ensure RLS is enabled
        ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
        
        -- Ensure policies exist
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'transfers' AND policyname = 'Users can read own transfers data'
        ) THEN
            CREATE POLICY "Users can read own transfers data"
                ON public.transfers
                FOR SELECT
                TO authenticated
                USING (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added SELECT policy to transfers';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'transfers' AND policyname = 'Users can insert own transfers data'
        ) THEN
            CREATE POLICY "Users can insert own transfers data"
                ON public.transfers
                FOR INSERT
                TO authenticated
                WITH CHECK (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added INSERT policy to transfers';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'transfers' AND policyname = 'Users can update own transfers data'
        ) THEN
            CREATE POLICY "Users can update own transfers data"
                ON public.transfers
                FOR UPDATE
                TO authenticated
                USING (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added UPDATE policy to transfers';
        END IF;
        
        -- Ensure notes column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'notes'
        ) THEN
            ALTER TABLE public.transfers ADD COLUMN notes text;
            RAISE NOTICE 'Added notes column to transfers';
        END IF;
    END IF;
END
$$;

-- Check if expenses table exists, create if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
        CREATE TABLE public.expenses (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            bank text NOT NULL,
            amount numeric NOT NULL,
            type text NOT NULL,
            category text NOT NULL,
            description text,
            user_id text,
            username text,
            edited_by text,
            updated_at timestamptz,
            created_at timestamptz DEFAULT now()
        );
        
        -- Enable RLS
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        
        -- Add policies
        CREATE POLICY "Users can read own expenses data"
            ON public.expenses
            FOR SELECT
            TO authenticated
            USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Users can insert own expenses data"
            ON public.expenses
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() IS NOT NULL);
            
        CREATE POLICY "Users can update own expenses data"
            ON public.expenses
            FOR UPDATE
            TO authenticated
            USING (auth.uid() IS NOT NULL);
            
        -- Create index
        CREATE INDEX IF NOT EXISTS expenses_created_at_idx ON public.expenses(created_at);
        
        RAISE NOTICE 'Created expenses table with proper permissions';
    ELSE
        RAISE NOTICE 'Expenses table already exists';
        
        -- Ensure RLS is enabled
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        
        -- Ensure policies exist
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'expenses' AND policyname = 'Users can read own expenses data'
        ) THEN
            CREATE POLICY "Users can read own expenses data"
                ON public.expenses
                FOR SELECT
                TO authenticated
                USING (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added SELECT policy to expenses';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'expenses' AND policyname = 'Users can insert own expenses data'
        ) THEN
            CREATE POLICY "Users can insert own expenses data"
                ON public.expenses
                FOR INSERT
                TO authenticated
                WITH CHECK (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added INSERT policy to expenses';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'expenses' AND policyname = 'Users can update own expenses data'
        ) THEN
            CREATE POLICY "Users can update own expenses data"
                ON public.expenses
                FOR UPDATE
                TO authenticated
                USING (auth.uid() IS NOT NULL);
            RAISE NOTICE 'Added UPDATE policy to expenses';
        END IF;
    END IF;
END
$$;

-- Output success message
SELECT 'Database tables and permissions verified and fixed' as result; 