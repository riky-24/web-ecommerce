# One-time secret values and instructions

This file is a convenience guide to help you paste required secrets into GitHub (Settings → Secrets and variables → Actions).

IMPORTANT: Do not commit actual secret values to the repo. Use the `scripts/generate-secrets.sh` script (runs locally) to create a one-time file `.secrets.local` with recommended values and copy-paste from it.

How to generate values (recommended):

- On Linux / Mac / WSL / Git Bash / PowerShell with Node installed:

  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

  Use the output for `JWT_SECRET`.

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
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — for Vercel deployments

Optional for backups / monitoring:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
- `SENDGRID_API_KEY`
- `SENTRY_DSN` / `DATADOG_API_KEY`

Notes:

- For production, prefer GitHub Environments (Settings → Environments) and set secrets there for `production` with required protection rules.
- Remove `.secrets.local` after copying values: `shred -u .secrets.local` or `rm .secrets.local`.
