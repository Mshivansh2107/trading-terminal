-- This migration fixes admin access for specific users
-- It updates the auth.users table to include admin status in app_metadata

-- First, create a function to update a user's admin status
CREATE OR REPLACE FUNCTION auth.update_user_admin_status(
  user_id UUID,
  is_admin BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's app_metadata to include is_admin flag
  UPDATE auth.users
  SET raw_app_meta_data = 
    raw_app_meta_data || 
    jsonb_build_object('is_admin', is_admin)
  WHERE id = user_id;
END;
$$;

-- Now grant the specific user admin access
-- Replace with your user ID from the console output
SELECT auth.update_user_admin_status(
  'e03ff253-104c-446a-af6a-442620bdc63e', -- Your user ID
  TRUE
);

-- Create an RLS policy that allows admins to perform admin actions
CREATE POLICY admin_policy
  ON public.users
  USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'); 