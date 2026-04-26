-- Create unified view for all expenses (invoices + party transactions)
-- This combines paid invoices and direct payments to workers/suppliers

CREATE OR REPLACE VIEW all_expenses AS
SELECT 
  -- Common fields
  id,
  created_at,
  'invoice' as expense_source,
  number as reference,
  expense_type as category,
  total_amount as amount,
  total_amount_usd as amount_usd,
  total_amount_iqd as amount_iqd,
  currency,
  description as notes,
  invoice_date as date,
  project_id,
  project_name,
  supplier_id,
  supplier_name,
  worker_id as labor_worker_id,
  labor_worker_name,
  'paid' as status,
  CASE 
    WHEN supplier_id IS NOT NULL THEN 'supplier'
    WHEN labor_worker_id IS NOT NULL THEN 'worker'
    ELSE 'general'
  END as party_type,
  -- Invoice specific fields
  total_amount,
  paid_amount,
  remaining_amount,
  due_date,
  image_path,
  created_by,
  created_by_name,
  record_status
FROM app_invoices 
WHERE record_status = 'active' 
  AND status IN ('paid', 'partial')
  AND paid_amount > 0

UNION ALL

SELECT 
  -- Common fields
  id,
  created_at,
  'transaction' as expense_source,
  'TX-' || id::text as reference,
  'payment' as category,
  amount,
  amount_usd,
  amount_iqd,
  currency,
  description,
  date,
  project_id,
  project_name,
  supplier_id,
  supplier_name,
  worker_id,
  worker_name,
  type as status,
  party_type,
  -- Transaction specific fields (null for invoices)
  null as total_amount,
  null as paid_amount, 
  null as remaining_amount,
  null as due_date,
  null as image_path,
  created_by,
  created_by_name,
  'active' as record_status
FROM app_party_transactions
WHERE source_invoice_id IS NULL
  AND source_kind IS NULL
ORDER BY date DESC, created_at DESC;

-- Add comments
COMMENT ON VIEW all_expenses IS 'Unified view of all expenses including paid invoices and direct payments to workers/suppliers';
