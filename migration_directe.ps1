# Migration directe via API Supabase
Write-Host "Migration ERP - Méthode directe" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Configuration depuis .env
$envFile = Get-Content ".env"
$supabaseUrl = ($envFile | Where-Object { $_ -match "VITE_SUPABASE_URL" }) -replace "VITE_SUPABASE_URL=", ""
$supabaseKey = ($envFile | Where-Object { $_ -match "VITE_SUPABASE_ANON_KEY" }) -replace "VITE_SUPABASE_ANON_KEY=", ""

Write-Host "URL Supabase: $supabaseUrl" -ForegroundColor White
Write-Host "Clé trouvée: $(if($supabaseKey){'Oui'}else{'Non'})" -ForegroundColor White

# Migration à appliquer
$migrationFile = "supabase/migrations/202604270002_fix_union_types.sql"

if (Test-Path $migrationFile) {
    Write-Host "Fichier de migration trouvé: $migrationFile" -ForegroundColor Green
    
    # Lire le contenu SQL
    $sqlContent = Get-Content $migrationFile -Raw
    Write-Host "Taille SQL: $($sqlContent.Length) caractères" -ForegroundColor White
    
    # Demander confirmation
    $continue = Read-Host "Appliquer cette migration? (O/N)"
    if ($continue -match "^[OoYy]") {
        Write-Host "Pour appliquer cette migration, vous avez deux options:" -ForegroundColor Yellow
        Write-Host "1. Via l'interface web Supabase (SQL Editor)" -ForegroundColor White
        Write-Host "2. Via psql si PostgreSQL est installé localement" -ForegroundColor White
        Write-Host ""
        Write-Host "Contenu SQL à copier:" -ForegroundColor Cyan
        Write-Host "-------------------" -ForegroundColor Gray
        Write-Host $sqlContent -ForegroundColor White
        Write-Host "-------------------" -ForegroundColor Gray
    } else {
        Write-Host "Migration annulée" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERREUR: Fichier de migration non trouvé" -ForegroundColor Red
}
