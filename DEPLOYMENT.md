# Production Launch Guide

This document helps you prepare and launch the microservice publicly.

1. Secrets & Environment

- Ensure the following secrets are stored in your deployment platform or CI:
  - `JWT_SECRET` (required)
  - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (required if using Stripe)
  - `SENDGRID_API_KEY` and `SENDGRID_LICENSE_TEMPLATE_ID` (if sending license emails)
  - `DATABASE_PATH` (or configure a managed DB or persistent volume)
  - `CORS_ORIGINS` (comma-separated allowed origins for your frontend)
  - Optional: `SERVICE_NAME`, `EMAIL_FROM`, monitoring credentials

2. Build & Images

- Use the provided GitHub Actions `release.yml` to build and push images to GHCR.
- When building the frontend, set `VITE_API_BASE` to the public API base for the build step.

3. Database Migrations and Backups

- Back up the SQLite file before applying migrations:
  ```bash
  cp data.sqlite data.sqlite.bak
  ```
- You can run `npm run migrate` to run the idempotent migration script. If `better-sqlite3` is not available, the app will perform additive migrations on startup.

4. Networking & TLS

- Place the app behind a reverse proxy (Nginx, Cloud Load Balancer) and terminate TLS there.
- Configure health checks to your deployment orchestrator: `/health` returns 200 when healthy.

5. Observability

- Expose metrics (`/metrics`) to your Prometheus scraping job.
- Stream logs to your log aggregation (e.g., Papertrail, Datadog) with structured logs.

6. Security

- Enforce strong `JWT_SECRET` and rotate secrets regularly.
- Set `CORS_ORIGINS` carefully to only your trusted frontends.
- Ensure `STRIPE_WEBHOOK_SECRET` is set to validate webhook signatures.
- Keep container images up-to-date and scan images for vulnerabilities.

7. Rollback

- Restore from backup if needed and redeploy the previous image.

8. Post-launch

- Monitor slow endpoints, error rates, and webhook failures.
- Add additional hardened configuration (WAF, stricter CSP, monitoring dashboards) as traffic grows.

If you'd like, I can help integrate one-click deploy scripts for common providers (DigitalOcean App Platform, Heroku, or Kubernetes manifests) — which provider should I prepare for?

## Free-hosting Quickstart (Vercel frontend + Fly.io backend)

1. Frontend (Vercel)

- Connect this repo to Vercel and create a new project pointing to the `frontend/` directory.
- Set the following Project Environment Variables in Vercel:
  - `VITE_API_BASE` = `https://<your-backend-domain>`
  - Any other environment variables you exposed to the browser (e.g., analytics)

2. Backend (Fly.io)

- Install `flyctl` and login: `flyctl auth login`.
- Create an app and a volume for SQLite:
  ```bash
  flyctl apps create my-microservice
  flyctl volumes create data --size 1 --region <region>
  ```
- Set required secrets on Fly:
  ```bash
  flyctl secrets set JWT_SECRET="<your-secret>" STRIPE_SECRET_KEY="<key>" STRIPE_WEBHOOK_SECRET="<secret>" CORS_ORIGINS="https://your-frontend.vercel.app"
  ```
- Deploy:
  ```bash
  flyctl deploy --config fly.toml
  ```

3. Notes

- `DATABASE_PATH` default is `/data/data.sqlite` when deployed on Fly with the `data` mount. The `fly.toml` included in this repo mounts a persistent volume at `/data`.
- Make sure `better-sqlite3` is installed (added to `package.json`) so the runtime uses SQLite on Fly.
- If you prefer a hosted Postgres (Supabase) later, I can add Postgres support + a migration script.

If you want, I can add GitHub Actions secrets instructions and finish the deploy workflows to auto-deploy on `main` (they are scaffolded in `.github/workflows`).
