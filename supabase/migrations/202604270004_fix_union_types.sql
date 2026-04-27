-- Correction des types dans la vue all_expenses
-- Résout l'erreur: UNION types numeric and text cannot be matched

DROP VIEW IF EXISTS all_expenses;

CREATE OR REPLACE VIEW all_expenses AS
WITH invoice_expenses AS (
  SELECT 
    i.id,
    i.created_at,
    'invoice' as expense_source,
    i.number as reference,
    'invoice' as category,
    i.total_amount as amount,
    null::numeric as amount_usd,
    null::numeric as amount_iqd,
    i.currency,
    i.notes,
    i.invoice_date as date,
    i.project_id,
    p.name as project_name,
    i.supplier_id,
    s.name as supplier_name,
    null::bigint as labor_worker_id,
    null::text as labor_worker_name,
    'paid' as status,
    CASE 
      WHEN i.supplier_id IS NOT NULL THEN 'supplier'
      ELSE 'general'
    END as party_type,
    -- Invoice specific fields (text cast for consistency)
    i.total_amount::text as total_amount_text,
    i.paid_amount::text as paid_amount_text,
    i.remaining_amount::text as remaining_amount_text,
    i.due_date::text as due_date_text,
    i.image_path,
    i.created_by,
    COALESCE(created_profile.full_name, created_profile.email) as created_by_name,
    i.record_status
  FROM app_invoices i
  LEFT JOIN projects p ON p.id = i.project_id
  LEFT JOIN suppliers s ON s.id = i.supplier_id
  -- Pas de jointure sur workers pour invoices
  LEFT JOIN profiles created_profile ON created_profile.id = i.created_by
  WHERE i.record_status = 'active' 
    AND i.status IN ('paid', 'partial')
    AND i.paid_amount > 0
),

party_expenses AS (
  SELECT 
    pt.id,
    pt.created_at,
    'transaction' as expense_source,
    'TX-' || pt.id::text as reference,
    COALESCE(pt.expense_category, 'general') as category,
    pt.amount,
    pt.amount_usd,
    pt.amount_iqd,
    pt.currency,
    pt.description,
    pt.date,
    pt.project_id,
    p.name as project_name,
    pt.supplier_id,
    s.name as supplier_name,
    pt.worker_id,
    w.name as worker_name,
    pt.type as status,
    pt.party_type,
    -- Transaction specific fields (text for consistency)
    null::text as total_amount_text,
    null::text as paid_amount_text, 
    null::text as remaining_amount_text,
    null::text as due_date_text,
    null as image_path,
    pt.created_by,
    COALESCE(created_profile.full_name, created_profile.email) as created_by_name,
    'active' as record_status
  FROM party_transactions pt
  LEFT JOIN projects p ON p.id = pt.project_id
  LEFT JOIN suppliers s ON s.id = pt.supplier_id
  LEFT JOIN workers w ON w.id = pt.worker_id
  LEFT JOIN profiles created_profile ON created_profile.id = pt.created_by
  WHERE pt.source_invoice_id IS NULL
    AND pt.source_kind IS NULL
)

SELECT * FROM invoice_expenses
UNION ALL
SELECT * FROM party_expenses
ORDER BY date DESC, created_at DESC;

COMMENT ON VIEW all_expenses IS 'Unified view of all expenses including paid invoices and direct payments to workers/suppliers - Fixed type compatibility';
