# Script simple pour installer Supabase CLI
Write-Host "Installation Supabase CLI" -ForegroundColor Cyan

# Variables
$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.exe"
$dir = "C:\Tools\supabase"
$file = "$dir\supabase.exe"

# Creer le repertoire
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force
}

# Telecharger
Write-Host "Telechargement..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $url -OutFile $file

# Verifier
if (Test-Path $file) {
    $size = (Get-Item $file).Length
    Write-Host "Telecharge: $([math]::Round($size/1MB, 2)) MB" -ForegroundColor Green
    
    # Tester
    try {
        $version = & $file --version
        Write-Host "Version: $version" -ForegroundColor Green
        Write-Host "Installation reussie!" -ForegroundColor Green
        Write-Host "Chemin: $file" -ForegroundColor White
    } catch {
        Write-Host "Erreur: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Erreur de telechargement" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pour utiliser:" -ForegroundColor Yellow
Write-Host "1. Ajoutez $dir au PATH" -ForegroundColor White
Write-Host "2. Ou utilisez directement: $file" -ForegroundColor White
Write-Host "3. Puis: supabase login" -ForegroundColor White
