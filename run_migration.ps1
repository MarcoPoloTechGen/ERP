# Script simple pour appliquer la migration SQL
# Necessite PostgreSQL installe avec psql dans le PATH

Write-Host "Migration ERP - Nettoyage et Optimisation" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Configuration
$MigrationFile = "supabase/migrations/202604270000_cleanup_and_optimize.sql"
$ValidationFile = "supabase/migrations/202604270001_validate_cleanup.sql"

# Verifier les fichiers
if (-not (Test-Path $MigrationFile)) {
    Write-Host "ERREUR: Fichier de migration non trouve: $MigrationFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ValidationFile)) {
    Write-Host "ERREUR: Fichier de validation non trouve: $ValidationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Fichiers de migration trouves:" -ForegroundColor Green
Write-Host "- Migration: $MigrationFile"
Write-Host "- Validation: $ValidationFile"
Write-Host ""

# Demander confirmation
$continue = Read-Host "Appliquer la migration? (O/N)"
if ($continue -notmatch "^[OoYy]") {
    Write-Host "Migration annulee." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Application de la migration principale..." -ForegroundColor Yellow

# Essayer d'executer la migration
try {
    $result = & psql -h localhost -U postgres -d erp_db -f $MigrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration principale terminee avec succes!" -ForegroundColor Green
    } else {
        Write-Host "ERREUR lors de la migration principale:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR: Impossible d'executer psql. Assurez-vous que PostgreSQL est installe." -ForegroundColor Red
    Write-Host "Message: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Execution de la validation..." -ForegroundColor Yellow

try {
    $result = & psql -h localhost -U postgres -d erp_db -f $ValidationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Validation terminee avec succes!" -ForegroundColor Green
    } else {
        Write-Host "AVERTISSEMENT: La validation a echoue:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERREUR lors de la validation:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Migration terminee!" -ForegroundColor Green
Write-Host "Consultez CLEANUP_OPTIMIZATION_README.md pour les details" -ForegroundColor Gray
Write-Host "===========================================" -ForegroundColor Cyan
