# Installation alternative de Supabase CLI
Write-Host "Installation Supabase CLI - Méthode alternative" -ForegroundColor Cyan

# Télécharger avec WebClient (plus fiable)
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile("https://github.com/supabase/cli/releases/download/v2.8.4/supabase_windows_amd64.exe", "C:\Tools\supabase\supabase.exe")
$webClient.Dispose()

# Vérifier l'installation
if (Test-Path "C:\Tools\supabase\supabase.exe") {
    Write-Host "✓ Supabase CLI téléchargé avec succès" -ForegroundColor Green
    & "C:\Tools\supabase\supabase.exe" --version
} else {
    Write-Host "✗ Échec du téléchargement" -ForegroundColor Red
}
