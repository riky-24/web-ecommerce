# Start local presentation environment (Windows PowerShell)
# Usage: Open PowerShell in repo root and run: ./scripts/start-local.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Seeding database..."
npm run seed

Write-Host "Starting backend (npm start)..."
Start-Process -FilePath npm -ArgumentList 'start' -WorkingDirectory $root -NoNewWindow

Write-Host "Building frontend..."
npm --prefix frontend run build

Write-Host "Serving frontend on http://localhost:5173"
Start-Process -FilePath npx -ArgumentList 'http-server','"' + (Join-Path $root 'frontend\dist') + '"','-p','5173' -WorkingDirectory $root -NoNewWindow

Write-Host "Done. Visit http://localhost:3000 for API and http://localhost:5173 for frontend."