import { supabase } from './supabase';

/**
 * Directly checks if a user is an admin by querying the users table or auth tables
 * This bypasses the metadata approach and directly verifies admin status
 */
export const checkIsUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    // First try to check in auth.users table (requires proper permissions)
    const { data: authData, error: authError } = await supabase
      .rpc('check_if_user_is_admin', { user_id: userId });
    
    if (!authError && authData === true) {
      return true;
    }

    // Fallback: check in the public users table if we have one
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (!userError && userData?.is_admin) {
      return true;
    }

    // If we reach here, user is not an admin
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}; 