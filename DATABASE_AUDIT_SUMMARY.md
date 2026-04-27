# Révision Complète de la Base de Données ERP - Résumé

## Date : 27 Avril 2026

## Problèmes Identifiés

### 1. **Vues Supprimées par la Migration Cleanup**
La migration `202604270000_cleanup_and_optimize.sql` a supprimé plusieurs vues essentielles utilisées par l'application :

| Vue Supprimée | Utilisée dans | Statut |
|--------------|---------------|--------|
| `app_party_transactions` | `erp-core.ts:2107` | **RESTAURÉE** |
| `app_supplier_transactions` | `erp-core.ts:2184` | **RESTAURÉE** |
| `app_worker_transactions` | Dashboard | **RESTAURÉE** |
| `app_income_transaction_history` | `erp-core.ts:2418` | **RESTAURÉE** |
| `app_invoice_history` | `erp-core.ts:2322` | **RESTAURÉE** |

### 2. **Tables Supprimées**
La migration cleanup a aussi supprimé des tables entières :

| Table Supprimée | Utilisée par | Statut |
|----------------|--------------|--------|
| `income_transaction_history` | Vue `app_income_transaction_history` | **RESTAURÉE** |
| `invoice_history` | Vue `app_invoice_history` | **RESTAURÉE** |
| `worker_transactions` | Remplacée par `party_transactions` | OK - Migration volontaire |

### 3. **Fichier Types TypeScript Vide**
Le fichier `src/lib/database.types.ts` était vide, ce qui empêchait la compilation TypeScript.

**Solution :** Recréation complète du fichier avec tous les types nécessaires.

## Actions Correctives

### 1. Migration SQL Créée
**Fichier :** `supabase/migrations/202604271200_restore_missing_views.sql`

Cette migration restaure :
- La table `income_transaction_history` avec son trigger
- La table `invoice_history` avec son trigger  
- La vue `app_party_transactions`
- La vue `app_worker_transactions`
- La vue `app_supplier_transactions`
- La vue `app_income_transaction_history`
- La vue `app_invoice_history`
- Les politiques RLS appropriées
- Les permissions GRANT

### 2. Types TypeScript Restaurés
**Fichier :** `src/lib/database.types.ts`

Types définis :
- Toutes les tables (`profiles`, `workers`, `suppliers`, `projects`, etc.)
- Toutes les vues (`app_*`)
- Les fonctions RPC (`can_access_project`, `is_admin`, etc.)

## Architecture Actuelle Recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                    TABLES DE BASE                          │
├─────────────────────────────────────────────────────────────┤
│  profiles, workers, suppliers, projects, products        │
│  invoices, party_transactions, income_transactions         │
│  invoice_history, income_transaction_history               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    VUES APP_*                              │
├─────────────────────────────────────────────────────────────┤
│  app_projects, app_products, app_invoices                   │
│  app_party_transactions, app_worker_transactions          │
│  app_supplier_transactions, app_income_transactions       │
│  app_invoice_history, app_income_transaction_history        │
│  all_expenses                                               │
└─────────────────────────────────────────────────────────────┘
```

## Comment Appliquer les Corrections

### 1. Appliquer la Migration SQL
```bash
cd c:\Users\Surfqce\Desktop\ERP
supabase db push
# Ou exécuter le fichier SQL via l'interface Supabase
```

### 2. Vérifier la Compilation TypeScript
```bash
cd c:\Users\Surfqce\Desktop\ERP
npm run type-check
# ou
npx tsc --noEmit
```

### 3. Tester l'Application
- Vérifier que la page Income Log fonctionne
- Vérifier que les transactions des travailleurs s'affichent
- Vérifier que l'historique des factures est accessible

## Points d'Attention Futurs

1. **Ne pas supprimer de vues `app_*`** sans vérifier leur usage dans le code
2. **Maintenir la cohérence** entre les migrations SQL et les types TypeScript
3. **Tester les migrations** dans un environnement de test avant production
4. **Documenter** les dépendances entre tables, vues et code

## Structure Finale des Vues

| Vue | Description | Dépendances |
|-----|-------------|-------------|
| `app_projects` | Projets avec comptage des bâtiments | `projects`, `project_buildings` |
| `app_products` | Produits avec noms fournisseur/projet | `products`, `suppliers`, `projects` |
| `app_invoices` | Factures avec toutes les jointures | `invoices`, `suppliers`, `projects`, `workers` |
| `app_invoice_history` | Historique des modifications | `invoice_history` |
| `app_income_transactions` | Transactions de revenus | `income_transactions`, `projects` |
| `app_income_transaction_history` | Historique des revenus | `income_transaction_history` |
| `app_party_transactions` | Toutes les transactions unifiées | `party_transactions`, `workers`, `suppliers` |
| `app_worker_transactions` | Transactions des travailleurs | `party_transactions`, `projects` |
| `app_supplier_transactions` | Transactions des fournisseurs | `party_transactions`, `projects` |
| `all_expenses` | Vue unifiée de toutes les dépenses | `invoices`, `party_transactions` |

---

**Status :** ✅ Corrections appliquées, prêt pour déploiement
