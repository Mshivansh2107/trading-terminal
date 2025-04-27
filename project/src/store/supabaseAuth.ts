import { atom } from 'jotai';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// Types
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Auth state atom
export const authStateAtom = atom<AuthState>(initialState);

// Action atoms
export const initSupabaseSessionAtom = atom(
  null,
  async (get, set) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      const { session } = data;
      const isAuthenticated = !!session;
      
      set(authStateAtom, {
        user: session?.user || null,
        session,
        isLoading: false,
        isAuthenticated,
        error: null,
      });
    } catch (error) {
      set(authStateAtom, {
        ...initialState,
        isLoading: false,
        error: (error as Error).message,
      });
    }
  }
);

// Sign in with email and password
export const signInWithEmailAtom = atom(
  null,
  async (get, set, { email, password }: { email: string; password: string }) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set(authStateAtom, {
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      set(authStateAtom, {
        ...get(authStateAtom),
        isLoading: false,
        error: (error as Error).message,
      });
      
      return { success: false, error: (error as Error).message };
    }
  }
);

// Sign up with email and password
export const signUpWithEmailAtom = atom(
  null,
  async (get, set, { email, password }: { email: string; password: string }) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Note: This won't immediately authenticate the user
      // They will need to verify their email first unless auto-confirm is enabled
      
      set(authStateAtom, {
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: !!data.session,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      set(authStateAtom, {
        ...get(authStateAtom),
        isLoading: false,
        error: (error as Error).message,
      });
      
      return { success: false, error: (error as Error).message };
    }
  }
);

// Sign out
export const signOutAtom = atom(
  null,
  async (get, set) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      set(authStateAtom, initialState);
      
      return { success: true };
    } catch (error) {
      set(authStateAtom, {
        ...get(authStateAtom),
        isLoading: false,
        error: (error as Error).message,
      });
      
      return { success: false, error: (error as Error).message };
    }
  }
);

// Add reset password atom
export const resetPasswordAtom = atom(
  null,
  async (get, set, { email }: { email: string }) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      set(authStateAtom, {
        ...get(authStateAtom),
        isLoading: false,
        error: (error as Error).message,
      });
      
      return { success: false, error: (error as Error).message };
    } finally {
      set(authStateAtom, {
        ...get(authStateAtom),
        isLoading: false,
      });
    }
  }
); 