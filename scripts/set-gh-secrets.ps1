# PowerShell template to set repository secrets using gh CLI
# Usage: set env vars then run: .\set-gh-secrets.ps1 -Repo "owner/repo"
param(
  [Parameter(Mandatory=$true)]
  [string]$Repo
)

$secrets = @(
  'FLY_API_TOKEN','FLY_APP_NAME','JWT_SECRET','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','CORS_ORIGINS','VERCEL_TOKEN','VERCEL_ORG_ID','VERCEL_PROJECT_ID','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION','S3_BUCKET'
)

foreach ($name in $secrets) {
  $val = (Get-Item -Path Env:$name -ErrorAction SilentlyContinue).Value
  if ($val) {
    Write-Host "Setting $name on $Repo"
    gh secret set $name --repo $Repo --body $val
  } else {
    Write-Host "Skipping $name (env var not set)"
  }
}

Write-Host "Done. Verify secrets at https://github.com/$Repo/settings/secrets/actions"
