-- Drop worker_transactions table and update all_expenses view
-- All worker transactions are now handled by party_transactions with party_type = 'worker'

-- First, drop the view that depends on worker_transactions
DROP VIEW IF EXISTS app_worker_transactions;

-- Then drop the table
DROP TABLE IF EXISTS worker_transactions CASCADE;

-- Update all_expenses view to use only party_transactions
DROP VIEW IF EXISTS all_expenses;

CREATE OR REPLACE FUNCTION get_invoices()
RETURNS TABLE (
  id text,
  created_at timestamp,
  expense_source text,
  reference text,
  category text,
  amount text,
  amount_usd text,
  amount_iqd text,
  currency text,
  notes text,
  date date,
  project_id text,
  project_name text,
  supplier_id text,
  supplier_name text,
  labor_worker_id text,
  labor_worker_name text,
  status text,
  party_type text,
  total_amount text,
  paid_amount text,
  remaining_amount text,
  due_date date,
  image_path text,
  created_by text,
  created_by_name text,
  record_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    created_at,
    'invoice' as expense_source,
    number as reference,
    expense_type as category,
    total_amount::text as amount,
    total_amount_usd::text as amount_usd,
    total_amount_iqd::text as amount_iqd,
    currency,
    notes,
    invoice_date as date,
    project_id::text,
    project_name,
    supplier_id::text,
    supplier_name,
    labor_worker_id::text,
    labor_worker_name,
    'paid' as status,
    CASE 
      WHEN supplier_id IS NOT NULL THEN 'supplier'
      WHEN labor_worker_id IS NOT NULL THEN 'worker'
      ELSE 'general'
    END as party_type,
    -- Invoice specific fields
    total_amount::text,
    paid_amount::text,
    remaining_amount::text,
    due_date,
    image_path,
    created_by,
    created_by_name,
    record_status
  FROM app_invoices 
  WHERE record_status = 'active' 
    AND status IN ('paid', 'partial')
    AND paid_amount > 0;
END; $$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_party_transactions()
RETURNS TABLE (
  id text,
  created_at timestamp,
  expense_source text,
  reference text,
  category text,
  amount text,
  amount_usd text,
  amount_iqd text,
  currency text,
  notes text,
  date date,
  project_id text,
  project_name text,
  supplier_id text,
  supplier_name text,
  labor_worker_id text,
  labor_worker_name text,
  status text,
  party_type text,
  total_amount text,
  paid_amount text,
  remaining_amount text,
  due_date date,
  image_path text,
  created_by text,
  created_by_name text,
  record_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id::text,
    created_at,
    'transaction' as expense_source,
    'TX-' || id::text as reference,
    COALESCE(expense_category, 'general') as category,
    amount::text,
    amount_usd::text,
    amount_iqd::text,
    currency,
    description,
    date,
    project_id::text,
    project_name,
    supplier_id::text,
    supplier_name,
    worker_id::text,
    worker_name,
    type as status,
    party_type,
    -- Transaction specific fields (null for invoices)
    NULL as total_amount,
    NULL as paid_amount, 
    NULL as remaining_amount,
    NULL as due_date,
    NULL as image_path,
    created_by,
    created_by_name,
    'active' as record_status
  FROM app_party_transactions
  WHERE source_invoice_id IS NULL
    AND source_kind IS NULL;
END; $$
LANGUAGE plpgsql;

CREATE OR REPLACE VIEW all_expenses AS
SELECT * FROM get_invoices()
UNION ALL
SELECT * FROM get_party_transactions()
ORDER BY date DESC, created_at DESC;

-- Add comments
COMMENT ON VIEW all_expenses IS 'Unified view of all expenses including paid invoices and direct payments to workers/suppliers (using only party_transactions)';