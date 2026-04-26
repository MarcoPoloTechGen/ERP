# Script PowerShell pour appliquer la migration de nettoyage et optimisation
# Ce script doit être exécuté avec les droits appropriés sur la base de données

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "MIGRATION DE NETTOYAGE ET OPTIMISATION ERP" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Configuration de la base de données
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "erp_db"
$DB_USER = "postgres"

# Chemins des fichiers
$MIGRATION_FILE = "supabase/migrations/202604270000_cleanup_and_optimize.sql"
$VALIDATION_FILE = "supabase/migrations/202604270001_validate_cleanup.sql"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Hôte: $DB_HOST" -ForegroundColor White
Write-Host "  Port: $DB_PORT" -ForegroundColor White
Write-Host "  Base: $DB_NAME" -ForegroundColor White
Write-Host "  Utilisateur: $DB_USER" -ForegroundColor White
Write-Host ""

# Vérifier si les fichiers existent
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "ERREUR: Fichier de migration non trouvé: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $VALIDATION_FILE)) {
    Write-Host "ERREUR: Fichier de validation non trouvé: $VALIDATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Fichiers trouvés:" -ForegroundColor Green
Write-Host "  Migration: $MIGRATION_FILE" -ForegroundColor White
Write-Host "  Validation: $VALIDATION_FILE" -ForegroundColor White
Write-Host ""

# Fonction pour exécuter SQL
function Execute-SQL {
    param(
        [string]$SQLFile,
        [string]$Description
    )
    
    Write-Host "Exécution: $Description" -ForegroundColor Yellow
    Write-Host "Fichier: $SQLFile" -ForegroundColor White
    
    try {
        # Essayer différentes méthodes pour trouver psql
        $psqlPath = $null
        
        # Chemins possibles pour psql
        $possiblePaths = @(
            "C:\Program Files\PostgreSQL\*\bin\psql.exe",
            "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
            "psql.exe"
        )
        
        foreach ($path in $possiblePaths) {
            try {
                $resolved = Resolve-Path $path -ErrorAction SilentlyContinue
                if ($resolved) {
                    $psqlPath = $resolved.Path
                    break
                }
            } catch {
                # Continuer
            }
        }
        
        if (-not $psqlPath) {
            Write-Host "ERREUR: psql.exe non trouvé. PostgreSQL doit être installé." -ForegroundColor Red
            Write-Host "Veuillez installer PostgreSQL ou ajouter psql.exe au PATH." -ForegroundColor Red
            return $false
        }
        
        # Construire la commande
        $cmd = "& `"$psqlPath`" -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f `"$SQLFile`""
        
        Write-Host "Commande: $cmd" -ForegroundColor Gray
        Write-Host ""
        
        # Exécuter la commande
        $result = Invoke-Expression $cmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $Description terminée avec succès" -ForegroundColor Green
            return $true
        } else {
            Write-Host "ERREUR lors de l'execution: $Description" -ForegroundColor Red
            Write-Host "Code de sortie: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "ERREUR: $_" -ForegroundColor Red
        return $false
    }
}

# Demander confirmation
Write-Host "ATTENTION: Cette migration va:" -ForegroundColor Yellow
Write-Host "  - Simplifier la vue all_expenses" -ForegroundColor White
Write-Host "  - Optimiser les index de party_transactions" -ForegroundColor White
Write-Host "  - Standardiser les noms de colonnes" -ForegroundColor White
Write-Host "  - Nettoyer les vues/tables non utilisées" -ForegroundColor White
Write-Host "  - Supprimer worker_transactions (remplacé par party_transactions)" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Voulez-vous continuer? (O/N)"
if ($confirmation -notmatch "^[OoYy]") {
    Write-Host "Migration annulée." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Étape 1: Appliquer la migration principale
$success1 = Execute-SQL -SQLFile $MIGRATION_FILE -Description "Migration principale de nettoyage et optimisation"

if (-not $success1) {
    Write-Host "ERREUR: La migration principale a échoué. Arrêt." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Étape 2: Exécuter la validation
$success2 = Execute-SQL -SQLFile $VALIDATION_FILE -Description "Validation des optimisations"

if (-not $success2) {
    Write-Host "AVERTISSEMENT: La validation a échoué, mais la migration a été appliquée." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✓ Migration et validation terminées avec succès!" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "RÉSUMÉ DE LA MIGRATION" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "1. Vue all_expenses optimisée avec CTE" -ForegroundColor White
Write-Host "2. Index consolidés dans party_transactions" -ForegroundColor White
Write-Host "3. Logique de source simplifiée" -ForegroundColor White
Write-Host "4. Noms de colonnes standardisés" -ForegroundColor White
Write-Host "5. Triggers optimisés avec logging" -ForegroundColor White
Write-Host "6. Vues non utilisées supprimées" -ForegroundColor White
Write-Host "7. Politiques RLS simplifiées" -ForegroundColor White
Write-Host "8. Contraintes CHECK standardisées" -ForegroundColor White
Write-Host "9. Tables/vues obsolètes supprimées" -ForegroundColor White
Write-Host ""
Write-Host "Documentation: CLEANUP_OPTIMIZATION_README.md" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan

# Instructions post-migration
Write-Host ""
Write-Host "PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "1. Vérifiez que votre application fonctionne correctement" -ForegroundColor White
Write-Host "2. Mettez à jour le code pour utiliser les nouvelles vues si nécessaire" -ForegroundColor White
Write-Host "3. Surveillez les performances des requêtes" -ForegroundColor White
Write-Host "4. Consultez la documentation pour plus de détails" -ForegroundColor White
