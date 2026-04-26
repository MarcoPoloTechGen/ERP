-- Update app_party_transactions view to include expense_category field
DROP VIEW IF EXISTS app_party_transactions;

CREATE OR REPLACE VIEW app_party_transactions AS
SELECT 
  pt.id,
  pt.amount,
  pt.amount_iqd,
  pt.amount_usd,
  pt.created_at,
  pt.created_by,
  pt.currency,
  pt.date,
  pt.description,
  pt.expense_category,
  pt.party_type,
  pt.project_id,
  p.name as project_name,
  pt.source_invoice_id,
  pt.source_kind,
  pt.supplier_id,
  s.name as supplier_name,
  pt.type,
  pt.worker_id,
  w.name as worker_name,
  true as can_manage,
  pt.created_by as created_by_name,
  CASE 
    WHEN pt.party_type = 'worker' THEN w.name
    WHEN pt.party_type = 'supplier' THEN s.name
    ELSE NULL
  END as party_name
FROM party_transactions pt
LEFT JOIN projects p ON pt.project_id = p.id
LEFT JOIN suppliers s ON pt.supplier_id = s.id  
LEFT JOIN workers w ON pt.worker_id = w.id;

-- Add comments
COMMENT ON VIEW app_party_transactions IS 'Enhanced view of party transactions with expense_category and related names';