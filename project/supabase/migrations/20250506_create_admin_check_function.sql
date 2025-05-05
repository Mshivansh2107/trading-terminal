-- Create a function to check if a user is an admin
-- This function can be called from the client via RPC
CREATE OR REPLACE FUNCTION public.check_if_user_is_admin(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This is important to access auth.users
AS $$
DECLARE
  is_admin_value boolean;
  user_exists boolean;
BEGIN
  -- First check if the user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin flag in app_metadata
  SELECT 
    CASE 
      WHEN (raw_app_meta_data->>'is_admin')::boolean = true THEN true
      ELSE false
    END INTO is_admin_value
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_value, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_if_user_is_admin(UUID) TO authenticated;

-- Also create a users table if it doesn't exist yet
-- This provides an alternative way to store admin status
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies to the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own row
CREATE POLICY "Users can view their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy to allow admins to read all rows
CREATE POLICY "Admins can view all data" 
  ON public.users 
  FOR SELECT 
  USING (public.check_if_user_is_admin(auth.uid()));

-- Allow all users to read is_admin field (but not modify it)
CREATE POLICY "Anyone can read is_admin" 
  ON public.users 
  FOR SELECT 
  USING (true) 
  WITH CHECK (false);

-- Insert admin user info if not already exists
INSERT INTO public.users (id, email, is_admin)
VALUES (
  'e03ff253-104c-446a-af6a-442620bdc63e', -- Your user ID
  'ajpsk22@gmail.com', -- Your email
  true -- Set as admin
)
ON CONFLICT (id) 
DO UPDATE SET 
  is_admin = true,
  updated_at = now(); 