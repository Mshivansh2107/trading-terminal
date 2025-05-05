-- This file contains SQL queries to check and set admin status
-- Run these queries in your Supabase SQL Editor

-- Check current admin status for your user
SELECT 
  id, 
  email, 
  raw_app_meta_data->'is_admin' as is_admin_app_meta,
  raw_user_meta_data->'is_admin' as is_admin_user_meta
FROM auth.users
WHERE email = 'ajpsk22@gmail.com';

-- If admin flag is missing, run this to set admin status
UPDATE auth.users
SET raw_app_meta_data = 
  raw_app_meta_data || 
  jsonb_build_object('is_admin', true)
WHERE email = 'ajpsk22@gmail.com';

-- After running the update, verify again
SELECT 
  id, 
  email, 
  raw_app_meta_data->'is_admin' as is_admin_app_meta
FROM auth.users
WHERE email = 'ajpsk22@gmail.com';

-- Note: After setting admin status, you need to sign out and sign in again
-- to refresh your session token with the updated metadata. 