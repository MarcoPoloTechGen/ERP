-- Create unified expenses table combining invoices and party_transactions
-- This will be the single source of truth for all expenses

-- Create the unified expenses table
CREATE TABLE expenses (
  -- Primary key and basic fields
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Expense identification
  reference TEXT NOT NULL, -- invoice number or TX-{id}
  expense_source TEXT NOT NULL CHECK (expense_source IN ('invoice', 'transaction')),
  expense_category TEXT NOT NULL DEFAULT 'other',
  
  -- Amount and currency (unified fields)
  amount DECIMAL(15,2) NOT NULL,
  amount_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_iqd DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'IQD')),
  
  -- Description and dates
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE, -- only for invoices
  
  -- Project association
  project_id BIGINT REFERENCES projects(id),
  project_name TEXT,
  
  -- Party association (unified worker/supplier)
  party_type TEXT CHECK (party_type IN ('worker', 'supplier', 'general')),
  worker_id BIGINT REFERENCES workers(id),
  worker_name TEXT,
  supplier_id BIGINT REFERENCES suppliers(id),
  supplier_name TEXT,
  
  -- Invoice-specific fields (null for transactions)
  status TEXT, -- invoice status: draft, sent, paid, partial, overdue
  record_status TEXT DEFAULT 'active' CHECK (record_status IN ('active', 'deleted')),
  total_amount DECIMAL(15,2), -- invoice total
  paid_amount DECIMAL(15,2) DEFAULT 0, -- invoice paid amount
  remaining_amount DECIMAL(15,2), -- invoice remaining amount
  image_path TEXT,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT,
  deleted_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT check_party_consistency 
    CHECK (
      (party_type = 'worker' AND worker_id IS NOT NULL AND supplier_id IS NULL) OR
      (party_type = 'supplier' AND supplier_id IS NOT NULL AND worker_id IS NULL) OR
      (party_type = 'general' AND worker_id IS NULL AND supplier_id IS NULL)
    ),
  CONSTRAINT check_expense_source_consistency
    CHECK (
      (expense_source = 'invoice' AND total_amount IS NOT NULL) OR
      (expense_source = 'transaction' AND total_amount IS NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_worker_id ON expenses(worker_id);
CREATE INDEX idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX idx_expenses_category ON expenses(expense_category);
CREATE INDEX idx_expenses_source ON expenses(expense_source);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_record_status ON expenses(record_status);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create updated view for unified expenses
DROP VIEW IF EXISTS all_expenses;

CREATE OR REPLACE VIEW all_expenses AS
SELECT 
  id,
  created_at,
  updated_at,
  reference,
  expense_source,
  expense_category,
  amount,
  amount_usd,
  amount_iqd,
  currency,
  description,
  date,
  due_date,
  project_id,
  project_name,
  party_type,
  worker_id,
  worker_name,
  supplier_id,
  supplier_name,
  status,
  record_status,
  total_amount,
  paid_amount,
  remaining_amount,
  image_path,
  created_by,
  created_by_name
FROM expenses
WHERE record_status = 'active'
ORDER BY date DESC, created_at DESC;

-- Add comments
COMMENT ON TABLE expenses IS 'Unified table for all expenses combining invoices and party transactions';
COMMENT ON VIEW all_expenses IS 'Unified view of all expenses from the single expenses table';