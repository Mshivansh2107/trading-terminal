import { supabase } from './supabase';

// Run database migrations
export async function migrateDatabase() {
  try {
    console.log('Running database migrations...');

    // Create pos_settings table if it doesn't exist
    await supabase.rpc('execute_sql', {
      command: `
        CREATE TABLE IF NOT EXISTS pos_settings (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id),
          settings JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT pos_settings_user_id_key UNIQUE (user_id)
        );
      `
    });

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
  }
} 