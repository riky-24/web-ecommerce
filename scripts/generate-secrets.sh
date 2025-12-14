#!/usr/bin/env bash
set -euo pipefail

# Generates secure secret values for the repo and writes a one-off file `.secrets.local`
# NOT intended to be committed. Use the output to paste into GitHub > Settings > Secrets.

OUT_FILE=.secrets.local
: > "$OUT_FILE"

echo "Generating secrets..."
# Prefer OpenSSL if available, then Node; otherwise print an error with a copy-paste PowerShell fallback.
if command -v openssl >/dev/null 2>&1; then
	JWT_SECRET=$(openssl rand -hex 64)
elif command -v node >/dev/null 2>&1; then
	JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
else
	echo "Error: neither 'openssl' nor 'node' found."
	echo "On Windows (PowerShell) you can run the following to generate a 64-byte hex secret and paste it into the GitHub UI:"
	echo
	echo "  powershell -Command \"$b=New-Object 'System.Byte[]' 64; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [System.BitConverter]::ToString($b).Replace('-','').ToLower()\""
	echo
	echo "Or install Node or OpenSSL and re-run this script."
	exit 1
fi
# Placeholder strings for Stripe webhook (must be copied from Stripe dashboard)
STRIPE_SECRET_KEY="<paste from Stripe>"
STRIPE_WEBHOOK_SECRET="<paste from Stripe Webhooks>"

cat > "$OUT_FILE" <<EOF
# Secrets to paste into GitHub Actions (one-time file; do NOT commit)
FLY_API_TOKEN=
FLY_APP_NAME=
JWT_SECRET=$JWT_SECRET
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
CORS_ORIGINS=https://your-frontend.vercel.app
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET=
SENDGRID_API_KEY=
EOF

chmod 600 "$OUT_FILE" || true

cat <<MSG
Generated secrets file: $OUT_FILE

Next steps:
1) Open GitHub repo → Settings → Secrets and variables → Actions → New repository secret
2) Copy each secret value from $OUT_FILE and paste into the UI (leave placeholders blank if you don't have them yet)
3) After adding required secrets, trigger workflows or push a test commit.

Security note: $OUT_FILE contains secrets; do not commit it. Remove after use: rm $OUT_FILE
MSG
