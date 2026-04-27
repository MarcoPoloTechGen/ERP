-- Fix missing expense_category column in party_transactions table
-- This migration ensures the expense_category column exists and is properly configured

-- =====================================================
-- ADD expense_category COLUMN IF MISSING
-- =====================================================

DO $$
BEGIN
  -- Check if the column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='party_transactions' 
      AND column_name='expense_category'
      AND table_schema='public'
  ) THEN
    ALTER TABLE party_transactions 
    ADD COLUMN expense_category TEXT NULL;
    
    RAISE NOTICE '✓ expense_category column added to party_transactions';
  ELSE
    RAISE NOTICE '✓ expense_category column already exists in party_transactions';
  END IF;
END $$;

-- =====================================================
-- CREATE INDEX IF MISSING
-- =====================================================

DO $$
BEGIN
  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename='party_transactions' 
      AND indexname='idx_party_transactions_expense_category'
  ) THEN
    CREATE INDEX idx_party_transactions_expense_category 
    ON party_transactions(expense_category);
    
    RAISE NOTICE '✓ expense_category index created';
  ELSE
    RAISE NOTICE '✓ expense_category index already exists';
  END IF;
END $$;

-- =====================================================
-- UPDATE NULL VALUES WITH DEFAULT CATEGORIES
-- =====================================================

UPDATE party_transactions 
SET expense_category = CASE 
  WHEN party_type = 'worker' AND type = 'debit' THEN 'salary_payment'
  WHEN party_type = 'worker' AND type = 'credit' THEN 'worker_advance'
  WHEN party_type = 'supplier' AND type = 'debit' THEN 'supplier_payment'
  WHEN party_type = 'supplier' AND type = 'credit' THEN 'supplier_credit'
  ELSE 'general'
END
WHERE expense_category IS NULL;

-- =====================================================
-- ADD COMMENT
-- =====================================================

COMMENT ON COLUMN party_transactions.expense_category IS 
  'Category of the expense for classification and reporting (e.g., salary, materials, services, etc.)';

-- =====================================================
-- VALIDATION
-- =====================================================

DO $$
BEGIN
  -- Verify the column exists and has data
  PERFORM 1 FROM party_transactions WHERE expense_category IS NOT NULL LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '✓ expense_category column is properly configured';
  ELSE
    RAISE EXCEPTION '✗ expense_category column validation failed';
  END IF;
  
  -- Count records with categories
  DECLARE
    v_total_count INTEGER;
    v_categorized_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_total_count FROM party_transactions;
    SELECT COUNT(*) INTO v_categorized_count FROM party_transactions WHERE expense_category IS NOT NULL;
    
    RAISE NOTICE '✓ party_transactions records: % total, % categorized', 
                 v_total_count, v_categorized_count;
  END;
END $$;
