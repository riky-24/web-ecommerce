#!/usr/bin/env bash
# Template: set repository secrets using `gh` CLI
# Usage: export values into env vars (locally or CI) then run this script
# Requires: gh (GitHub CLI) authenticated and repository already created

set -euo pipefail
REPO=${1:-}
if [ -z "$REPO" ]; then
  echo "Usage: $0 owner/repo"
  exit 1
fi

# List of secrets we expect to set (read from current env)
SECRETS=(
  FLY_API_TOKEN
  FLY_APP_NAME
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  CORS_ORIGINS
  VERCEL_TOKEN
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_REGION
  S3_BUCKET
)

for name in "${SECRETS[@]}"; do
  val="${!name:-}"
  if [ -n "$val" ]; then
    echo "Setting $name on $REPO"
    gh secret set "$name" --repo "$REPO" --body "$val"
  else
    echo "Skipping $name (not set in environment)"
  fi
done

echo "Done. Verify secrets at: https://github.com/$REPO/settings/secrets/actions"
