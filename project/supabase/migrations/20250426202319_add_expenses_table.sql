/*
  Add Expenses/Income Table

  This migration adds:
  - `expenses` table to track external income and expenses
    - `id` (uuid, primary key)
    - `bank` (text)
    - `amount` (numeric)
    - `type` (text) - 'expense' or 'income'
    - `category` (text, optional)
    - `description` (text, optional)
    - `user_id` (text, optional)
    - `username` (text, optional)
    - `created_at` (timestamptz)
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category text,
  description text,
  user_id text,
  username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own expenses data"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own expenses data"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS expenses_created_at_idx ON expenses(created_at); 