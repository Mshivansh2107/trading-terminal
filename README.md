# Instructions for Fixing and Testing Stock/Cash Management

## 1. Run the Database Verification Script

To ensure your database tables have the correct structure and permissions:

1. Navigate to your Supabase dashboard
2. Go to the SQL Editor
3. Paste the contents of `project/supabase/migrations/verify_tables.sql`
4. Run the script
5. Check the output for any errors or notifications

## 2. Testing Stock Updates

1. Open the application and log in
2. Navigate to the Dashboard
3. Go to the "Stock Management" tab
4. Click the "Edit" icon next to any platform
5. Enter a new quantity (different from the current value)
6. Click "Update Stock"
7. Check the browser console (F12) for detailed logs of the update process
8. Verify the stock value has changed in the UI

## 3. Testing Cash Updates

1. Navigate to the "Cash Flow" tab
2. Click the "Edit" icon next to any bank
3. Enter a new amount (different from the current value)
4. Click "Update Balance"
5. Check the browser console (F12) for detailed logs of the update process
6. Verify the cash amount has changed in the UI

## 4. Debugging

If updates still don't appear in the backend:

1. Check the browser console for any error messages
2. Verify your Supabase connection is working in other parts of the app
3. Check the RLS policies in Supabase to ensure your user has proper permissions
4. Verify the correct tables exist in your Supabase database

The update process now includes verification steps to confirm data is properly saved to Supabase. 