-- Add expense_category field to party_transactions for better classification
-- This allows grouping and categorizing all payment types

ALTER TABLE party_transactions 
ADD COLUMN expense_category TEXT NULL;

-- Create index for better performance
CREATE INDEX idx_party_transactions_expense_category ON party_transactions(expense_category);

-- Add comments
COMMENT ON COLUMN party_transactions.expense_category IS 'Category of the expense for classification and reporting (e.g., salary, materials, services, etc.)';

-- Set default categories for existing records
UPDATE party_transactions 
SET expense_category = CASE 
  WHEN party_type = 'worker' AND type = 'debit' THEN 'salary_payment'
  WHEN party_type = 'worker' AND type = 'credit' THEN 'worker_advance'
  WHEN party_type = 'supplier' AND type = 'debit' THEN 'supplier_payment'
  WHEN party_type = 'supplier' AND type = 'credit' THEN 'supplier_credit'
  ELSE 'general'
END
WHERE expense_category IS NULL;
