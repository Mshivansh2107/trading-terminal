export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
}

export interface Transaction {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  edited_by_user_id?: string;
  type: 'sale' | 'purchase' | 'transfer';
  amount: number;
  quantity: number;
  platform: string;
  bank?: string;
  notes?: string;
} 