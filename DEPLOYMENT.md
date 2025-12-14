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
- If you use QRIS, set `QRIS_PROVIDER` (e.g., `xendit` or `midtrans`) and provider-specific secrets (for Xendit: `XENDIT_API_KEY`, optional `XENDIT_CREATE_QR_URL` / `XENDIT_GET_STATUS_URL`; for Midtrans: `MIDTRANS_SERVER_KEY`). Also set `QRIS_CALLBACK_URL` or `APP_BASE_URL` so the provider webhook can reach `/checkout/qris-callback`.

QRIS Provider setup notes:

- Xendit: create a QR payment (dynamic QR) and set the `callback_url` to your public `/checkout/qris-callback`. Configure `XENDIT_API_KEY` and (optionally) `XENDIT_CREATE_QR_URL` if you use a custom endpoint. You can also set `XENDIT_GET_STATUS_URL` with a template that contains `{id}` to poll payment status.
- Midtrans: configure server key in `MIDTRANS_SERVER_KEY` and (optionally) `MIDTRANS_CREATE_QR_URL` / `MIDTRANS_GET_STATUS_URL` if you use a custom endpoint. Use `callback_url` pointing to `/checkout/qris-callback` so the webhook updates order status in this service.

Security:

- Prefer verifying provider webhooks with a signature secret when the provider exposes one. This service exposes `QRIS_CALLBACK_URL` and will attempt to call provider-specific `handleCallback` implementations to map incoming webhook payloads to `paymentId`.
- Ensure your provider's callback endpoint is reachable from the public internet (use a staging domain or an SSH tunnel for testing).

Local testing tip

- You can simulate provider webhooks locally (for Xendit/Midtrans) by POSTing a minimal payload to the callback endpoint:

```bash
curl -X POST http://localhost:3000/checkout/qris-callback \
  -H "Content-Type: application/json" \
  -d '{"external_id":"<YOUR_PAYMENT_ID>"}'
```

- If your provider signs webhook payloads, add the expected header (e.g. `X-CALLBACK-SIGNATURE`) when testing locally to exercise signature verification logic if you implement it.

Run migrations before starting the service in production:

```bash
# ensure DB has qris/product/order columns
npm run migrate:qris
```

If you are deploying to a managed Postgres (Supabase), use an appropriate SQL migration instead (not the script above).
- Keep container images up-to-date and scan images for vulnerabilities.

7. Rollback

- Restore from backup if needed and redeploy the previous image.

8. Post-launch

- Monitor slow endpoints, error rates, and webhook failures.
- Add additional hardened configuration (WAF, stricter CSP, monitoring dashboards) as traffic grows.

---

## Rollback & Backups (detailed)

- **Immediate rollback:** revert the merge that caused the issue and redeploy the previous image/tag. For Fly, deploy a previous release or the prior image.
- **Database restore:** if data corruption/loss is suspected, restore from the latest tested backup. The repo contains a GitHub Action (`.github/workflows/backup-to-s3.yml`) that can dump SQLite from the running Fly instance to S3. Ensure `FLY_APP_NAME`, `S3_BUCKET`, and AWS creds are configured as secrets.
- **Verification:** after rollback or restore, run smoke checks against staging (`/health`, `/`) and run acceptance E2E tests before re-promoting to production.

## Dependency management (detailed)

- The repo temporarily uses `overrides` in `package.json` to pin specific patched transitive dependencies (e.g., `axios`, `semver`) until the lockfile is updated by a dependency PR. These `overrides` may cause `npx npm-check-updates` to fail with `EOVERRIDE` locally.
- Recommended approach to update dependencies safely:
  1. Use the `Auto Bump Dependencies` workflow (Actions → Auto Bump Dependencies → Run workflow) so bumps run on an Ubuntu runner and produce a PR with updated lockfile.
  2. If you must update locally: remove `overrides` temporarily, run `npx npm-check-updates -u && npm install`, commit the updated `package-lock.json`, open a PR, and reinstate or re-evaluate `overrides` after CI passes.
  3. If CI audit reports high vulnerabilities, address them in the dependency PRs and ensure `npm audit --audit-level=high` passes on merge.

If you want, I can run the Auto Bump workflow for you (from the Actions UI) or open PRs programmatically if you provide a PAT with minimal scope or add a repo secret for automation.

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
