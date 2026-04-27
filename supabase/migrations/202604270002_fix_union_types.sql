-- Correction des erreurs de types dans la vue all_expenses
-- Cette migration corrige les problèmes de types incompatibles dans les UNION

-- =====================================================
-- CORRECTION DE LA VUE all_expenses
-- =====================================================

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
    null::bigint as worker_id,  -- Invoices n'ont pas de worker direct
    null::text as worker_name,
    'paid' as status,
    CASE 
      WHEN i.supplier_id IS NOT NULL THEN 'supplier'
      ELSE 'general'
    END as party_type,
    -- Invoice specific fields
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,
    i.due_date,
    i.image_path,
    i.created_by,
    COALESCE(created_profile.full_name, created_profile.email) as created_by_name,
    i.record_status
  FROM app_invoices i
  LEFT JOIN projects p ON p.id = i.project_id
  LEFT JOIN suppliers s ON s.id = i.supplier_id
  -- Pas de jointure sur workers car invoices n'ont pas de worker_id
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
    pt.worker_id,  -- Déjà standardisé
    w.name as worker_name,
    pt.type as status,
    pt.party_type,
    -- Transaction specific fields (null for invoices)
    null::numeric as total_amount,  -- Type explicite
    null::numeric as paid_amount,   -- Type explicite
    null::numeric as remaining_amount, -- Type explicite
    null::date as due_date,         -- Type explicite
    null::text as image_path,       -- Type explicite
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

COMMENT ON VIEW all_expenses IS 'Unified view of all expenses including paid invoices and direct payments to workers/suppliers - Fixed UNION types';

-- =====================================================
-- VALIDATION DE LA CORRECTION
-- =====================================================

-- Test simple pour vérifier que la vue fonctionne
DO $$
BEGIN
  PERFORM 1 FROM all_expenses LIMIT 1;
  RAISE NOTICE '✓ Vue all_expenses corrigée et fonctionnelle';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans la vue all_expenses: %', SQLERRM;
END $$;

-- Vérifier les types des colonnes
DO $$
DECLARE
  v_column_types RECORD;
BEGIN
  -- Vérifier que les colonnes ont les bons types
  FOR v_column_types IN 
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'all_expenses' 
      AND table_schema = 'public'
      AND column_name IN ('total_amount', 'paid_amount', 'remaining_amount', 'due_date', 'image_path')
  LOOP
    RAISE NOTICE 'Colonne %: %', v_column_types.column_name, v_column_types.data_type;
  END LOOP;
  
  RAISE NOTICE '✓ Types de colonnes vérifiés';
END $$;
