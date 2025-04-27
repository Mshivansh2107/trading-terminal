import { supabase } from './supabase';
import { authStateAtom } from '../store/supabaseAuth';
import { getDefaultStore } from 'jotai';

// Function to record transaction history
export const recordTransactionEdit = async (
  transactionId: string,
  transactionType: 'sale' | 'purchase' | 'transfer',
  previousData: any,
  newData: any
) => {
  try {
    const authState = getDefaultStore().get(authStateAtom);
    const editorUserId = authState.user?.id;
    
    if (!editorUserId) {
      console.error('No authenticated user found');
      return { success: false, error: 'Not authenticated' };
    }
    
    // 1. Update the transaction with the editor's user ID
    const { error: updateError } = await supabase
      .from(transactionType + 's') // 'sales', 'purchases', or 'transfers'
      .update({ 
        ...newData,
        edited_by_user_id: editorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // 2. Record the edit history
    const { error: historyError } = await supabase
      .from('transaction_history')
      .insert({
        transaction_id: transactionId,
        transaction_type: transactionType,
        editor_user_id: editorUserId,
        previous_data: previousData,
        new_data: newData,
        edited_at: new Date().toISOString()
      });
    
    if (historyError) {
      console.error('Error recording edit history:', historyError);
      return { success: false, error: historyError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in recordTransactionEdit:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Function to get transaction edit history
export const getTransactionHistory = async (transactionId: string) => {
  try {
    const { data, error } = await supabase
      .from('transaction_history')
      .select(`
        id,
        transaction_id,
        transaction_type,
        editor_user_id,
        previous_data,
        new_data,
        edited_at,
        users:editor_user_id (id, email, username, display_name)
      `)
      .eq('transaction_id', transactionId)
      .order('edited_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching transaction history:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getTransactionHistory:', error);
    return { success: false, error: (error as Error).message, data: null };
  }
}; 