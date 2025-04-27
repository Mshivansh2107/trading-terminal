/*
  Add DELETE policies to all transaction tables.
  This migration adds policies that allow authenticated users to delete transactions.
  This supports the requirement for deleting any created sales, purchases, transfers, and expenses.
*/

-- Add delete policies for sales table
CREATE POLICY "Users can delete sales data"
  ON sales
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add delete policies for purchases table
CREATE POLICY "Users can delete purchases data"
  ON purchases
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add delete policies for transfers table
CREATE POLICY "Users can delete transfers data"
  ON transfers
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add delete policies for bank_transfers table
CREATE POLICY "Users can delete bank transfers data"
  ON bank_transfers
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add delete policies for expenses table
CREATE POLICY "Users can delete expenses data"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL); 