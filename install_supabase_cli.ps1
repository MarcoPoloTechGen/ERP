# Script pour installer Supabase CLI sur Windows
# Télécharge le binaire officiel depuis GitHub

Write-Host "Installation de Supabase CLI pour Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuration
$DownloadUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.exe"
$InstallDir = "C:\Tools\supabase"
$ExecutablePath = "$InstallDir\supabase.exe"

# Créer le répertoire d'installation s'il n'existe pas
if (-not (Test-Path $InstallDir)) {
    Write-Host "Création du répertoire: $InstallDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Télécharger Supabase CLI
Write-Host "Téléchargement de Supabase CLI..." -ForegroundColor Yellow
try {
    # Utiliser Invoke-WebRequest pour télécharger
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExecutablePath -UseBasicParsing
    
    if (Test-Path $ExecutablePath) {
        Write-Host "✓ Téléchargement réussi" -ForegroundColor Green
        Write-Host "Fichier: $ExecutablePath" -ForegroundColor White
    } else {
        Write-Host "ERREUR: Échec du téléchargement" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR lors du téléchargement: $_" -ForegroundColor Red
    exit 1
}

# Vérifier que le fichier est valide
$fileSize = (Get-Item $ExecutablePath).Length
if ($fileSize -lt 1MB) {
    Write-Host "ERREUR: Fichier téléchargé invalide (trop petit: $fileSize octets)" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Fichier valide ($([math]::Round($fileSize/1MB, 2)) MB)" -ForegroundColor Green

# Ajouter au PATH système
Write-Host "Ajout au PATH système..." -ForegroundColor Yellow
try {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$InstallDir*") {
        $newPath = $currentPath + ";" + $InstallDir
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "✓ Ajouté au PATH utilisateur" -ForegroundColor Green
    } else {
        Write-Host "✓ Déjà dans le PATH" -ForegroundColor Green
    }
} catch {
    Write-Host "AVERTISSEMENT: Impossible d'ajouter au PATH automatiquement" -ForegroundColor Yellow
    Write-Host "Ajoutez manuellement: $InstallDir" -ForegroundColor Yellow
}

# Tester l'installation
Write-Host "Test de l'installation..." -ForegroundColor Yellow
try {
    # Tester directement avec le chemin complet
    $version = & $ExecutablePath --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase CLI installé avec succès!" -ForegroundColor Green
        Write-Host "Version: $version" -ForegroundColor White
    } else {
        Write-Host "ERREUR: L'exécutable ne fonctionne pas" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR lors du test: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTALLATION TERMINÉE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Redémarrez votre terminal PowerShell" -ForegroundColor White
Write-Host "2. Testez: supabase --version" -ForegroundColor White
Write-Host "3. Connectez-vous: supabase login" -ForegroundColor White
Write-Host "4. Appliquez la migration: supabase db push" -ForegroundColor White
Write-Host ""
Write-Host "Si 'supabase' n'est pas reconnu après redémarrage:" -ForegroundColor Yellow
Write-Host "- Utilisez le chemin complet: $ExecutablePath" -ForegroundColor Gray
Write-Host "- Ou ajoutez manuellement $InstallDir au PATH" -ForegroundColor Gray
