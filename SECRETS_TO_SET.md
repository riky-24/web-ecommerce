# One-time secret values and instructions

This file is a convenience guide to help you paste required secrets into GitHub (Settings → Secrets and variables → Actions).

IMPORTANT: Do not commit actual secret values to the repo. Use the `scripts/generate-secrets.sh` script (runs locally) to create a one-time file `.secrets.local` with recommended values and copy-paste from it.

How to generate a secure `JWT_SECRET` (copy-paste):

- Recommended: at least 32 raw bytes (256 bits). We use 64 bytes for extra safety (hex length 128).

- Linux / macOS / WSL / Git Bash (OpenSSL):

  ```bash
  openssl rand -hex 64
  ```

- Node (cross-platform):

  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- Windows PowerShell (copy-paste as a single line):

  ```powershell
  powershell -Command "$b=New-Object 'System.Byte[]' 64; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [System.BitConverter]::ToString($b).Replace('-','').ToLower()"
  ```

- How to use the output: copy the generated hex string exactly (no quotes, no extra spaces) and paste it into the GitHub Secrets value field for `JWT_SECRET`.

- Tip: if you prefer automation, use `scripts/generate-secrets.sh` which tries to produce suitable values and writes them to a one-time file `.secrets.local` (remove it after copying).

- Use the `scripts/generate-secrets.sh` script to produce `.secrets.local` (it sets `JWT_SECRET` automatically and provides placeholders):
  ```bash
  chmod +x scripts/generate-secrets.sh
  ./scripts/generate-secrets.sh
  # then open .secrets.local and copy values into GitHub UI
  ```

Secrets to add in the GitHub UI (exact names):

- `FLY_API_TOKEN` — from https://fly.io/account/personal_tokens
- `FLY_APP_NAME` — your Fly app name
- `JWT_SECRET` — strong random hex string (see generation above)
- `STRIPE_SECRET_KEY` — Stripe secret key (live or test)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (from Stripe Dashboard > Webhooks)
- `CORS_ORIGINS` — comma-separated allowed origins (e.g. `https://your-frontend.vercel.app`)
- `XENDIT_API_KEY` — API key for Xendit (required if `QRIS_PROVIDER=xendit`)
- `MIDTRANS_SERVER_KEY` — server key for Midtrans (required if `QRIS_PROVIDER=midtrans`)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — for Vercel deployments

Optional for backups / monitoring:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
- `SENDGRID_API_KEY`
- `SENTRY_DSN` / `DATADOG_API_KEY`

Notes:

- For production, prefer GitHub Environments (Settings → Environments) and set secrets there for `production` with required protection rules.
- Remove `.secrets.local` after copying values: `shred -u .secrets.local` or `rm .secrets.local`.
