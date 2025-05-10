import { atom } from 'jotai';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { checkIsUserAdmin } from '../lib/supabaseAdmin';

// Types
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
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
      
      if (isAuthenticated && session?.user) {
        const isAdmin = await checkIsUserAdmin(session.user.id);
      
      set(authStateAtom, {
          user: session.user,
        session,
        isLoading: false,
        isAuthenticated,
          isAdmin,
          error: null,
        });
      } else {
        set(authStateAtom, {
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
        error: null,
      });
      }
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
      
      let isAdmin = false;
      if (data.user) {
        isAdmin = await checkIsUserAdmin(data.user.id);
      }
      
      set(authStateAtom, {
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
        isAdmin,
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
        isAdmin: false,
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
      // Use the current origin or the production domain if available
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Reset password redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
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

// Add verify OTP for password reset
export const verifyOtpAtom = atom(
  null,
  async (get, set, { email, token, password }: { email: string; token: string; password?: string }) => {
    set(authStateAtom, { ...get(authStateAtom), isLoading: true, error: null });
    
    try {
      // First verify and get session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });
      
      if (verifyError) throw verifyError;
      
      // If password is provided, update it immediately
      if (password && verifyData.session) {
        const { error: updateError } = await supabase.auth.updateUser({
          password
        });
        
        if (updateError) throw updateError;
        
        // Update auth state with new session
        set(authStateAtom, {
          user: verifyData.user,
          session: verifyData.session,
          isLoading: false,
          isAuthenticated: true,
          isAdmin: verifyData.user ? await checkIsUserAdmin(verifyData.user.id) : false,
          error: null
        });
        
        return { success: true, session: verifyData.session };
      }
      
      // If no password, just verify the token and return success
      return { success: true, session: verifyData.session };
      
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