# Trading Terminal Application

## Supabase Authentication Setup

This application uses Supabase for authentication with email/password.

### 1. Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com) if you don't have one already
2. Create a new project 
3. Get your project URL and anon key from Settings > API

### 2. Environment Configuration

Create a `.env` file in the root of the project with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Authentication Setup

1. Go to Authentication > Settings in your Supabase Dashboard
2. Configure Email Authentication:
   - You can enable/disable email confirmations
   - Customize email templates for confirmation, magic links, etc.

### 4. Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create a custom users table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- Give authenticated users access to read user data
CREATE POLICY "Allow users to read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Let only admins create/update/delete users
CREATE POLICY "Allow admins to create users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Allow admins to update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Track transaction edits
CREATE TABLE public.transaction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  editor_user_id UUID REFERENCES auth.users(id),
  previous_data JSONB,
  new_data JSONB,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add editor_user_id column to transactions tables
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES auth.users(id);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 5. First Admin User

After creating your first user, manually set them as an admin using SQL:

```sql
UPDATE public.users SET is_admin = true WHERE email = 'your_email@example.com';
```

## 6. Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the application. 