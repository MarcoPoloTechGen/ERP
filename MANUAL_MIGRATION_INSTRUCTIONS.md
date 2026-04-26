# Instructions Manuelles pour la Migration de Nettoyage et Optimisation

## Situation Actuelle
PostgreSQL n'est pas installé sur ce système. Voici plusieurs options pour appliquer la migration :

## Option 1: Installer PostgreSQL (Recommandé)

### Installation
1. Téléchargez PostgreSQL depuis: https://www.postgresql.org/download/windows/
2. Installez-le avec le chemin ajouté au PATH
3. Redémarrez votre terminal
4. Exécutez: `powershell -ExecutionPolicy Bypass -File "run_migration.ps1"`

### Configuration de la Base de Données
```sql
-- Créer la base de données si elle n'existe pas
CREATE DATABASE erp_db;

-- Créer l'utilisateur si nécessaire
CREATE USER postgres WITH SUPERUSER PASSWORD 'votre_mot_de_passe';
```

## Option 2: Utiliser un Client Graphique

### pgAdmin
1. Installez pgAdmin (inclus avec PostgreSQL)
2. Connectez-vous à votre base de données
3. Ouvrez l'éditeur de requêtes
4. Copiez-collez le contenu de `supabase/migrations/202604270000_cleanup_and_optimize.sql`
5. Exécutez la requête
6. Répétez avec le fichier de validation

### DBeaver
1. Téléchargez DBeaver depuis: https://dbeaver.io/
2. Créez une connexion PostgreSQL
3. Ouvrez l'éditeur SQL
4. Exécutez les fichiers de migration

## Option 3: Utiliser Supabase CLI

Si vous utilisez Supabase:

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Appliquer la migration
supabase db push
```

## Option 4: Migration par Étapes Manuelles

### Étape 1: Préparation
```sql
-- Sauvegarder la base de données
CREATE DATABASE erp_db_backup AS SELECT * FROM erp_db;
```

### Étape 2: Appliquer les optimisations
Copiez-collez le contenu du fichier `202604270000_cleanup_and_optimize.sql` dans votre client SQL et exécutez-le.

### Étape 3: Validation
Exécutez le contenu du fichier `202604270001_validate_cleanup.sql`.

## Contenu des Fichiers de Migration

### Migration Principale: `202604270000_cleanup_and_optimize.sql`
Ce fichier contient:
- ✅ Simplification de la vue `all_expenses` avec CTE
- ✅ Consolidation des index dans `party_transactions`
- ✅ Simplification de la logique de source
- ✅ Standardisation des noms de colonnes
- ✅ Optimisation des triggers
- ✅ Nettoyage des vues non utilisées
- ✅ Simplification des politiques RLS
- ✅ Standardisation des contraintes CHECK
- ✅ Suppression des tables/vues obsolètes

### Validation: `202604270001_validate_cleanup.sql`
Ce fichier vérifie:
- ✅ Fonctionnalité des vues créées
- ✅ Présence des index optimisés
- ✅ Création des domaines
- ✅ Présence des contraintes
- ✅ Fonctionnalité des triggers
- ✅ Validité des politiques RLS
- ✅ Cohérence des données

## Résultats Attendus

Après la migration, vous devriez voir:
```
✓ Vue all_expenses valide et fonctionnelle
✓ Vue app_party_transactions_unified valide et fonctionnelle
✓ Index optimisés présents dans party_transactions
✓ Tous les domaines sont créés
✓ Contraintes CHECK présentes dans party_transactions
✓ Trigger de synchronisation des balances présent
✓ Politiques RLS simplifiées présentes
✓ Données source_type/source_reference cohérentes
✓ Fonction standardize_user_name fonctionnelle
```

## Dépannage

### Erreurs Communes
1. **"psql n'est pas reconnu"**: PostgreSQL n'est pas dans le PATH
2. **"Connexion refusée"**: Service PostgreSQL non démarré
3. **"Base de données n'existe pas"**: Créer la base de données d'abord

### Solutions
1. **Ajouter PostgreSQL au PATH**:
   - Ajouter `C:\Program Files\PostgreSQL\*\bin` au PATH système
   - Redémarrer le terminal

2. **Démarrer le service PostgreSQL**:
   - Ouvrir `services.msc`
   - Démarrer le service `postgresql-x64-XX`

3. **Vérifier la connexion**:
   ```sql
   -- Tester la connexion
   \l
   ```

## Prochaines Étapes

1. **Appliquer la migration** en utilisant une des options ci-dessus
2. **Vérifier la validation** pour s'assurer que tout fonctionne
3. **Tester l'application** pour s'assurer qu'elle fonctionne avec les nouvelles vues
4. **Consulter la documentation** dans `CLEANUP_OPTIMIZATION_README.md`

## Support

Si vous rencontrez des problèmes:
1. Vérifiez que PostgreSQL est correctement installé
2. Assurez-vous que le service PostgreSQL est en cours d'exécution
3. Vérifiez les permissions de la base de données
4. Consultez les logs PostgreSQL pour plus de détails

---

**Note**: Cette migration optimisera significativement les performances et la maintenabilité de votre base de données ERP. Il est recommandé de l'appliquer dès que possible.
