-- Create an RPC function that allows deleting users from auth.users
-- This function should be limited to users with proper admin privileges

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calling_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Get the ID of the calling user
    calling_user_id := auth.uid();
    
    -- Check if the calling user is an admin in our users table
    SELECT u.is_admin INTO is_admin
    FROM public.users u
    WHERE u.id = calling_user_id;
    
    -- Only proceed if the calling user is an admin
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Permission denied: Only admin users can delete users';
    END IF;
    
    -- Delete the user from auth.users
    DELETE FROM auth.users WHERE id = user_id;
    
    RETURN true;
END;
$$;

-- Grant permissions to authenticated users (they'll still need to pass the admin check)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated; 