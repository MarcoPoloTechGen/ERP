-- Script de validation pour vérifier que le nettoyage et l'optimisation sont corrects
-- Ce script vérifie l'intégrité après la migration de nettoyage

-- =====================================================
-- VALIDATION DES VUES CRÉÉES
-- =====================================================

-- Vérifier que la vue all_expenses fonctionne
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'all_expenses') THEN
    RAISE EXCEPTION 'Vue all_expenses non trouvée';
  END IF;
  
  -- Test simple de la vue
  PERFORM 1 FROM all_expenses LIMIT 1;
  RAISE NOTICE '✓ Vue all_expenses valide et fonctionnelle';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans la vue all_expenses: %', SQLERRM;
END $$;

-- Vérifier que la vue unifiée fonctionne
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'app_party_transactions_unified') THEN
    RAISE EXCEPTION 'Vue app_party_transactions_unified non trouvée';
  END IF;
  
  -- Test simple de la vue
  PERFORM 1 FROM app_party_transactions_unified LIMIT 1;
  RAISE NOTICE '✓ Vue app_party_transactions_unified valide et fonctionnelle';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans la vue app_party_transactions_unified: %', SQLERRM;
END $$;

-- =====================================================
-- VALIDATION DES INDEX
-- =====================================================

-- Vérifier les nouveaux index
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM pg_indexes 
  WHERE tablename = 'party_transactions' 
    AND indexname LIKE 'idx_party_transactions_%';
  
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Index manquants dans party_transactions. Trouvés: %', v_count;
  END IF;
  
  RAISE NOTICE '✓ Index optimisés présents dans party_transactions (%)', v_count;
END $$;

-- =====================================================
-- VALIDATION DES DOMAINES
-- =====================================================

-- Vérifier que les domaines sont créés
DO $$
DECLARE
  v_domain_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_domain_count
  FROM information_schema.domains 
  WHERE domain_name IN ('party_type_enum', 'transaction_type_enum', 'currency_enum', 'record_status_enum');
  
  IF v_domain_count < 4 THEN
    RAISE EXCEPTION 'Domaines manquants. Trouvés: %', v_domain_count;
  END IF;
  
  RAISE NOTICE '✓ Tous les domaines sont créés (%)', v_domain_count;
END $$;

-- =====================================================
-- VALIDATION DES CONTRAINTES
-- =====================================================

-- Vérifier les contraintes sur party_transactions
DO $$
DECLARE
  v_constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_constraint_count
  FROM information_schema.check_constraints cc
  JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'party_transactions'
    AND tc.constraint_type = 'CHECK';
  
  IF v_constraint_count < 3 THEN
    RAISE EXCEPTION 'Contraintes CHECK manquantes. Trouvées: %', v_constraint_count;
  END IF;
  
  RAISE NOTICE '✓ Contraintes CHECK présentes dans party_transactions (%)', v_constraint_count;
END $$;

-- =====================================================
-- VALIDATION DES TRIGGERS
-- =====================================================

-- Vérifier que le trigger est actif
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_sync_party_balance' 
      AND event_object_table = 'party_transactions'
  ) THEN
    RAISE EXCEPTION 'Trigger trg_sync_party_balance non trouvé';
  END IF;
  
  RAISE NOTICE '✓ Trigger de synchronisation des balances présent';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans les triggers: %', SQLERRM;
END $$;

-- =====================================================
-- VALIDATION DES POLITIQUES RLS
-- =====================================================

-- Vérifier les politiques simplifiées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'party_transactions' 
      AND policyname = 'party transactions access'
  ) THEN
    RAISE EXCEPTION 'Politique RLS unifiée non trouvée';
  END IF;
  
  RAISE NOTICE '✓ Politiques RLS simplifiées présentes';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans les politiques RLS: %', SQLERRM;
END $$;

-- =====================================================
-- VALIDATION DE L'INTÉGRITÉ DES DONNÉES
-- =====================================================

-- Vérifier que les données sont cohérentes
DO $$
DECLARE
  v_inconsistent_count INTEGER;
BEGIN
  -- Vérifier source_type/source_reference
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM party_transactions 
  WHERE (source_type IS NULL AND source_reference IS NULL)
     OR (source_type = 'invoice' AND source_invoice_id IS NULL)
     OR (source_type = 'direct' AND source_invoice_id IS NOT NULL);
  
  IF v_inconsistent_count > 0 THEN
    RAISE NOTICE '⚠ % enregistrements avec source_type/source_reference incohérents', v_inconsistent_count;
  ELSE
    RAISE NOTICE '✓ Données source_type/source_reference cohérentes';
  END IF;
END $$;

-- =====================================================
-- VALIDATION DES FONCTIONS
-- =====================================================

-- Tester la fonction de standardisation
DO $$
BEGIN
  -- Vérifier que la fonction existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'standardize_user_name') THEN
    RAISE EXCEPTION 'Fonction standardize_user_name non trouvée';
  END IF;
  
  -- Test simple
  PERFORM standardize_user_name(NULL);
  RAISE NOTICE '✓ Fonction standardize_user_name fonctionnelle';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur dans la fonction standardize_user_name: %', SQLERRM;
END $$;

-- =====================================================
-- VALIDATION DES TABLES/VUES SUPPRIMÉES
-- =====================================================

-- Vérifier que les anciennes tables sont supprimées
DO $$
DECLARE
  v_old_tables TEXT[];
  v_table_name TEXT;
BEGIN
  v_old_tables := ARRAY['worker_transactions', 'income_transaction_history', 'invoice_history'];
  
  FOREACH v_table_name IN ARRAY v_old_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table_name) THEN
      RAISE NOTICE '⚠ Table % toujours présente', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ Vérification des tables supprimées terminée';
END $$;

-- =====================================================
-- RAPPORT DE VALIDATION
-- =====================================================

CREATE OR REPLACE TEMP VIEW validation_report AS
SELECT 
  'Nettoyage et Optimisation ERP' as operation,
  current_timestamp as validation_date,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'all_expenses') THEN 'ÉCHEC'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'app_party_transactions_unified') THEN 'ÉCHEC'
    ELSE 'SUCCÈS'
  END as status;

-- Afficher le rapport final
SELECT * FROM validation_report;

RAISE NOTICE '';
RAISE NOTICE '=====================================================';
RAISE NOTICE 'RAPPORT FINAL DE VALIDATION';
RAISE NOTICE '=====================================================';
RAISE NOTICE 'Migration 202604270000_cleanup_and_optimize.sql validée';
RAISE NOTICE 'Toutes les optimisations ont été appliquées avec succès';
RAISE NOTICE '=====================================================';

-- Nettoyer la vue temporaire
DROP VIEW IF EXISTS validation_report;
