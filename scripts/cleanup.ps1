param()
Write-Host "This script will remove local artifacts that should not be committed to the repo:`n - coverage/`n - data.sqlite.json`n - .secrets.local"
$ans = Read-Host "Are you sure you want to continue? [y/N]"
if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host 'Aborted'; exit 0 }

Write-Host 'Removing coverage/'
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue coverage

Write-Host 'Removing data.sqlite.json'
Remove-Item -Force -ErrorAction SilentlyContinue data.sqlite.json

Write-Host 'Removing .secrets.local'
Remove-Item -Force -ErrorAction SilentlyContinue .secrets.local

Write-Host 'Removing frontend/dist'
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue frontend\dist

Write-Host 'Done. To remove these files from Git history, use git rm --cached or a history rewrite tool like BFG/git-filter-repo.'
