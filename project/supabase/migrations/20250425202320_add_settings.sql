-- Modify sales and purchases tables to allow manual order number entry
-- This SQL should be added to your migrations

-- Make sure order_number doesn't have any default value or trigger for auto-generation
ALTER TABLE sales 
DROP CONSTRAINT IF EXISTS sales_order_number_generation, 
ALTER COLUMN order_number TYPE text;

-- Make sure order_number doesn't have any default value or trigger for auto-generation
ALTER TABLE purchases 
DROP CONSTRAINT IF EXISTS purchases_order_number_generation,
ALTER COLUMN order_number TYPE text;

-- Update comment to reflect the change
COMMENT ON COLUMN sales.order_number IS 'Order number entered by user';
COMMENT ON COLUMN purchases.order_number IS 'Order number entered by user'; 