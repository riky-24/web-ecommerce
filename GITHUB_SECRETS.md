# GitHub Secrets to add for deploys and production

Add these in repository Settings → Secrets and variables → Actions.

Required for Fly deploy workflow (.github/workflows/deploy-fly.yml)
- FLY_API_TOKEN: your Fly API token (from fly.io account)
- JWT_SECRET: strong JWT signing secret
- STRIPE_SECRET_KEY: Stripe secret key (if using Stripe)
- STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
- CORS_ORIGINS: comma-separated origins (e.g. https://your-frontend.vercel.app)

Required for Vercel deploy workflow (.github/workflows/deploy-vercel.yml)
- VERCEL_TOKEN: token from Vercel account
- VERCEL_ORG_ID: Vercel organization id
- VERCEL_PROJECT_ID: Vercel project id

Optional / recommended
- SENDGRID_API_KEY: for email sending
- GHCR_USERNAME / GHCR_TOKEN or DOCKERHUB_USERNAME / DOCKERHUB_TOKEN: if pushing Docker images to external registries
- SENTRY_DSN / DATADOG_API_KEY: monitoring if used

Notes
- Keep secrets scoped to the repository and avoid exposing them in logs.
- You can set additional runtime env variables on Fly (via `flyctl secrets set`) or via the Fly web UI.
