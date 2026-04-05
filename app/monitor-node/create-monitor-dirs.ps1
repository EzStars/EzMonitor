# PowerShell script to create monitor module structure
$basePath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $basePath

Write-Host "Creating monitor directory structure..." -ForegroundColor Green

$directories = @(
    "src\monitor",
    "src\monitor\dto",
    "src\monitor\entities"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir" -ForegroundColor Cyan
    } else {
        Write-Host "Already exists: $dir" -ForegroundColor Yellow
    }
}

Write-Host "`nDirectory structure created successfully!" -ForegroundColor Green
Write-Host "`nVerifying structure:" -ForegroundColor Yellow
Get-ChildItem -Path "src\monitor" -Recurse -Directory | ForEach-Object { Write-Host "  $_" }
