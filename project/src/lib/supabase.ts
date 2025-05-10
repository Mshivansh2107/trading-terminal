import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Determine the site URL for redirection
const siteUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'https://trading-terminal-silk.vercel.app';

// Create the Supabase client with additional options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Set the redirect URL to the current site
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Explicitly set the site URL for redirects
    redirectTo: `${siteUrl}/reset-password`,
  },
});

// Test the connection
supabase.from('sales').select('*', { count: 'exact' })
  .then(({ count, error }) => {
    if (error) {
      console.error('Database connection error:', error.message);
    } else {
      console.log('Successfully connected to database. Sales count:', count);
    }
  });