# Script d'installation du Supabase CLI pour Windows
# Executez ce script avec PowerShell : .\install-supabase-cli.ps1

$ErrorActionPreference = "Stop"

# Configuration
$version = "2.20.5"
$downloadUrl = "https://github.com/supabase/cli/releases/download/v$version/supabase_windows_amd64.exe"
$installDir = "$env:LOCALAPPDATA\Supabase"
$exePath = "$installDir\supabase.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Supabase CLI v$version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Creer le dossier d'installation
if (-not (Test-Path $installDir)) {
    Write-Host "Creation du dossier: $installDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# Telecharger l'executable
Write-Host "Telechargement depuis GitHub..." -ForegroundColor Yellow
Write-Host "URL: $downloadUrl" -ForegroundColor Gray

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Methode 1: Invoke-WebRequest
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing -TimeoutSec 120
    } catch {
        Write-Host "Methode 1 echouee, tentative avec curl..." -ForegroundColor Yellow
        
        # Methode 2: curl.exe
        $curlPath = (Get-Command curl.exe -ErrorAction SilentlyContinue).Source
        if ($curlPath) {
            & $curlPath -L -o $exePath $downloadUrl --ssl-no-revoke --max-time 120
        } else {
            throw "curl.exe non trouve"
        }
    }
    
    # Verifier que le fichier existe et a une taille correcte
    if (-not (Test-Path $exePath)) {
        throw "Le fichier n'a pas ete telecharge"
    }
    
    $fileSize = (Get-Item $exePath).Length
    if ($fileSize -lt 1000000) {
        throw "Le fichier telecharge est trop petit ($fileSize bytes) - telechargement incomplet"
    }
    
    Write-Host "[OK] Telechargement reussi ($fileSize bytes)" -ForegroundColor Green
    
} catch {
    Write-Host "ERREUR: Impossible de telecharger Supabase CLI" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions alternatives:" -ForegroundColor Yellow
    Write-Host "1. Telechargez manuellement depuis: https://github.com/supabase/cli/releases" -ForegroundColor White
    Write-Host "2. Placez supabase_windows_amd64.exe dans: $installDir" -ForegroundColor White
    Write-Host "3. Renommez-le en 'supabase.exe'" -ForegroundColor White
    exit 1
}

# Ajouter au PATH
Write-Host ""
Write-Host "Configuration du PATH..." -ForegroundColor Yellow

$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", "User")
    Write-Host "[OK] Ajoute au PATH utilisateur" -ForegroundColor Green
} else {
    Write-Host "[OK] Deja present dans le PATH" -ForegroundColor Green
}

# Verifier l'installation
Write-Host ""
Write-Host "Verification..." -ForegroundColor Yellow

$env:PATH = [Environment]::GetEnvironmentVariable("PATH", "User")

try {
    $versionOutput = & $exePath --version
    Write-Host "[OK] Installation reussie!" -ForegroundColor Green
    Write-Host "  Version: $versionOutput" -ForegroundColor White
} catch {
    Write-Host "[ATTENTION] L'installation semble OK mais la verification a echoue" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation terminee!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Utilisation:" -ForegroundColor Yellow
Write-Host "  supabase --version                  : Verifier l'installation" -ForegroundColor White
Write-Host "  supabase login                       : Se connecter a Supabase" -ForegroundColor White
Write-Host "  supabase db push                     : Appliquer les migrations" -ForegroundColor White
Write-Host "  supabase functions deploy <nom>      : Deployer une fonction" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Redemarrez votre terminal pour utiliser 'supabase' dans le PATH" -ForegroundColor Yellow