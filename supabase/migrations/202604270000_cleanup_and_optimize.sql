-- Migration pour nettoyer et optimiser la base de données ERP
-- Cette migration regroupe plusieurs optimisations : vues, index, triggers, et nettoyage

-- =====================================================
-- 1. SIMPLIFIER LA VUE all_expenses AVEC DES CTE
-- =====================================================

DROP VIEW IF EXISTS all_expenses;

CREATE OR REPLACE VIEW all_expenses AS
WITH invoice_expenses AS (
  SELECT 
    i.id,
    i.created_at,
    'invoice' as expense_source,
    i.number as reference,
    i.expense_type as category,
    i.total_amount as amount,
    i.total_amount_usd as amount_usd,
    i.total_amount_iqd as amount_iqd,
    i.currency,
    i.notes,
    i.invoice_date as date,
    i.project_id,
    p.name as project_name,
    i.supplier_id,
    s.name as supplier_name,
    i.labor_worker_id,
    w.name as labor_worker_name,
    'paid' as status,
    CASE 
      WHEN i.supplier_id IS NOT NULL THEN 'supplier'
      WHEN i.labor_worker_id IS NOT NULL THEN 'worker'
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
  LEFT JOIN workers w ON w.id = i.labor_worker_id
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
    -- Transaction specific fields (null for invoices)
    null as total_amount,
    null as paid_amount, 
    null as remaining_amount,
    null as due_date,
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

COMMENT ON VIEW all_expenses IS 'Unified view of all expenses including paid invoices and direct payments to workers/suppliers - Optimized with CTEs';

-- =====================================================
-- 2. CONSOLIDER ET NETTOYER LES INDEX DUPLIQUÉS
-- =====================================================

-- Supprimer les index dupliqués ou redondants
DROP INDEX IF EXISTS idx_party_transactions_worker_id;
DROP INDEX IF EXISTS idx_party_transactions_supplier_id;
DROP INDEX IF EXISTS idx_party_transactions_project_id;
DROP INDEX IF EXISTS idx_party_transactions_date;
DROP INDEX IF EXISTS idx_party_transactions_source_invoice_id;

-- Créer des index optimisés et consolidés
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_transactions_composite 
  ON party_transactions(party_type, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_transactions_party_lookup 
  ON party_transactions(party_type, worker_id, supplier_id) 
  WHERE worker_id IS NOT NULL OR supplier_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_transactions_project_date 
  ON party_transactions(project_id, date DESC) 
  WHERE project_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_transactions_source_lookup 
  ON party_transactions(source_invoice_id, source_kind) 
  WHERE source_invoice_id IS NOT NULL;

-- =====================================================
-- 3. SIMPLIFIER LA LOGIQUE DE party_transactions
-- =====================================================

-- Ajouter une colonne unifiée pour la source
ALTER TABLE party_transactions ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE party_transactions ADD COLUMN IF NOT EXISTS source_reference TEXT;

-- Mettre à jour les données existantes
UPDATE party_transactions 
SET 
  source_type = CASE 
    WHEN source_invoice_id IS NOT NULL THEN 'invoice'
    WHEN source_kind IS NOT NULL THEN source_kind
    ELSE 'direct'
  END,
  source_reference = CASE 
    WHEN source_invoice_id IS NOT NULL THEN 'INV-' || source_invoice_id
    ELSE 'TX-' || id
  END
WHERE source_type IS NULL;

-- Ajouter des contraintes pour garantir la cohérence
ALTER TABLE party_transactions 
ADD CONSTRAINT party_transactions_source_check 
CHECK (
  (source_type = 'invoice' AND source_invoice_id IS NOT NULL) OR
  (source_type = 'direct' AND source_invoice_id IS NULL) OR
  (source_type IN ('labor_expense', 'supplier_expense') AND source_kind IS NOT NULL)
);

-- =====================================================
-- 4. STANDARDISER LES NOMS DE COLONNES
-- =====================================================

-- Créer une fonction pour standardiser les noms
CREATE OR REPLACE FUNCTION standardize_user_name(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(full_name, email)
  FROM profiles 
  WHERE id = user_id;
$$;

-- Mettre à jour les vues pour utiliser la fonction standardisée
DROP VIEW IF EXISTS app_invoices CASCADE;

CREATE OR REPLACE VIEW app_invoices
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.number,
  i.status,
  i.record_status,
  i.deleted_at,
  i.deleted_by,
  i.supplier_id,
  s.name as supplier_name,
  i.project_id,
  p.name as project_name,
  i.building_id,
  pb.name as building_name,
  i.product_id,
  pr.name as product_name,
  i.total_amount,
  i.paid_amount,
  GREATEST(i.total_amount - i.paid_amount, 0) as remaining_amount,
  i.currency,
  i.invoice_date,
  i.due_date,
  i.notes,
  i.image_path,
  i.created_by,
  standardize_user_name(i.created_by) as created_by_name,
  i.created_at
FROM invoices i
LEFT JOIN suppliers s ON s.id = i.supplier_id
LEFT JOIN projects p ON p.id = i.project_id
LEFT JOIN project_buildings pb ON pb.id = i.building_id
LEFT JOIN products pr ON pr.id = i.product_id;

-- =====================================================
-- 5. OPTIMISER LES TRIGGERS DE SYNCHRONISATION
-- =====================================================

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trg_sync_worker_balance_from_party_transactions ON party_transactions;
DROP TRIGGER IF EXISTS trg_sync_expense_party_transactions ON invoices;

-- Créer un trigger optimisé avec logging
CREATE OR REPLACE FUNCTION sync_party_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_id BIGINT;
  v_operation TEXT;
BEGIN
  v_operation := TG_OP;
  
  -- Logging pour debugging
  RAISE LOG 'Party balance sync: % operation on party_transactions', v_operation;
  
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.worker_id IS NOT NULL THEN
    PERFORM recalculate_worker_balance(OLD.worker_id);
    RAISE LOG 'Recalculated balance for worker % (old)', OLD.worker_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.worker_id IS NOT NULL THEN
    PERFORM recalculate_worker_balance(NEW.worker_id);
    RAISE LOG 'Recalculated balance for worker % (new)', NEW.worker_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in sync_party_balance: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_party_balance
AFTER INSERT OR UPDATE OR DELETE ON party_transactions
FOR EACH ROW EXECUTE FUNCTION sync_party_balance();

-- =====================================================
-- 6. NETTOYER LES VUES NON UTILISÉES
-- =====================================================

-- Supprimer les vues dupliquées ou non utilisées
DROP VIEW IF EXISTS app_supplier_transactions CASCADE;
DROP VIEW IF EXISTS app_party_transactions CASCADE;

-- Créer une vue unifiée pour les transactions de party
CREATE OR REPLACE VIEW app_party_transactions_unified
WITH (security_invoker = true)
AS
SELECT 
  pt.id,
  pt.party_type,
  COALESCE(pt.worker_id, pt.supplier_id) as party_id,
  standardize_user_name(CASE 
    WHEN pt.party_type = 'worker' THEN (SELECT full_name FROM workers WHERE id = pt.worker_id)
    WHEN pt.party_type = 'supplier' THEN (SELECT name FROM suppliers WHERE id = pt.supplier_id)
  END) as party_name,
  pt.worker_id,
  w.name as worker_name,
  pt.supplier_id,
  s.name as supplier_name,
  pt.project_id,
  p.name as project_name,
  pt.type,
  pt.amount,
  pt.currency,
  pt.description,
  pt.date,
  pt.created_at,
  pt.amount_usd,
  pt.amount_iqd,
  pt.expense_category,
  pt.source_type,
  pt.source_reference
FROM party_transactions pt
LEFT JOIN workers w ON w.id = pt.worker_id
LEFT JOIN suppliers s ON s.id = pt.supplier_id
LEFT JOIN projects p ON p.id = pt.project_id;

-- =====================================================
-- 7. SIMPLIFIER LES POLITIQUES RLS
-- =====================================================

-- Créer des fonctions réutilisables pour les politiques
CREATE OR REPLACE FUNCTION can_access_party_transaction()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    auth.role() = 'authenticated' 
    AND public.can_access_project(party_transactions.project_id);
$$;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "party transactions scoped select" ON party_transactions;
DROP POLICY IF EXISTS "party transactions scoped insert" ON party_transactions;
DROP POLICY IF EXISTS "party transactions scoped update" ON party_transactions;
DROP POLICY IF EXISTS "party transactions scoped delete" ON party_transactions;

-- Créer des politiques simplifiées
CREATE POLICY "party transactions access" ON party_transactions
FOR ALL TO authenticated
USING (can_access_party_transaction())
WITH CHECK (can_access_party_transaction());

-- =====================================================
-- 8. STANDARDISER LES CONTRAINTES CHECK
-- =====================================================

-- Créer des domaines pour standardiser les contraintes
CREATE DOMAIN party_type_enum AS TEXT
CHECK (VALUE IN ('worker', 'supplier'));

CREATE DOMAIN transaction_type_enum AS TEXT
CHECK (VALUE IN ('credit', 'debit'));

CREATE DOMAIN currency_enum AS TEXT
CHECK (VALUE IN ('USD', 'IQD'));

CREATE DOMAIN record_status_enum AS TEXT
CHECK (VALUE IN ('active', 'deleted'));

-- Mettre à jour les tables pour utiliser les domaines
ALTER TABLE party_transactions 
ALTER COLUMN party_type TYPE party_type_enum USING party_type::party_type_enum,
ALTER COLUMN type TYPE transaction_type_enum USING type::transaction_type_enum,
ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum;

-- =====================================================
-- 9. SUPPRIMER LES TABLES/VUES NON UTILISÉES
-- =====================================================

-- Identifier les tables potentially non utilisées
DROP TABLE IF EXISTS worker_transactions CASCADE; -- Remplacé par party_transactions
DROP TABLE IF EXISTS income_transaction_history CASCADE; -- Peut être reconstruit si nécessaire
DROP TABLE IF EXISTS invoice_history CASCADE; -- Peut être reconstruit si nécessaire

-- Supprimer les vues history qui peuvent être reconstruites
DROP VIEW IF EXISTS app_income_transaction_history CASCADE;
DROP VIEW IF EXISTS app_invoice_history CASCADE;

-- =====================================================
-- 10. AJOUTER DES COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE party_transactions IS 'Unified table for all worker and supplier transactions';
COMMENT ON COLUMN party_transactions.source_type IS 'Type of source: invoice, direct, labor_expense, supplier_expense';
COMMENT ON COLUMN party_transactions.source_reference IS 'Human-readable reference to the source';
COMMENT ON VIEW app_party_transactions_unified IS 'Unified view for all party transactions with standardized naming';
COMMENT ON DOMAIN party_type_enum IS 'Domain for party types: worker or supplier';
COMMENT ON DOMAIN transaction_type_enum IS 'Domain for transaction types: credit or debit';
COMMENT ON DOMAIN currency_enum IS 'Domain for currencies: USD or IQD';
COMMENT ON DOMAIN record_status_enum IS 'Domain for record status: active or deleted';

-- Créer une vue d'information sur le schéma
CREATE OR REPLACE VIEW schema_info AS
SELECT 
  'party_transactions' as table_name,
  'Unified transactions table' as description,
  'Replaces worker_transactions' as notes
UNION ALL
SELECT 
  'all_expenses' as table_name,
  'Unified expenses view' as description,
  'Combines invoices and party transactions' as notes
UNION ALL
SELECT 
  'app_party_transactions_unified' as table_name,
  'Unified party transactions view' as description,
  'Replaces app_worker_transactions and app_supplier_transactions' as notes;

-- Grant permissions
GRANT SELECT ON schema_info TO authenticated;
GRANT SELECT ON app_party_transactions_unified TO authenticated;
GRANT SELECT ON all_expenses TO authenticated;
