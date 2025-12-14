# Microservice Sample (JavaScript)

Ringkasan singkat scaffold microservice menggunakan Express.

Quick start

1. Install dependencies

```bash
cd microservice
npm install
```

2. Run in development (requires `nodemon`)

```bash
npm run dev
```

3. Run production

```bash
npm start
```

Docker

```bash
docker build -t microservice-sample .
docker run -p 3000:3000 microservice-sample
# or
docker-compose up --build
```

Endpoints

- `GET /` - basic info
- `GET /health` - health check

Configuration

Set these environment variables for production use:

- `PORT` - service port (default 3000)
- `JWT_SECRET` - JWT signing secret
- `ADMIN_USERNAME` - admin username for management APIs
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `SENDGRID_API_KEY` - SendGrid API key (optional)
- `SENDGRID_LICENSE_TEMPLATE_ID` - SendGrid dynamic template id for license emails (optional)
- `EMAIL_FROM` - sender email address for outgoing mail
- `DATABASE_PATH` - path to sqlite DB file; use `:memory:` for in-memory during tests

Frontend

- `frontend/` contains a small Vite + React storefront and admin UI.
- Dev: `cd frontend && npm install && npm run dev` (Vite proxies API calls to `localhost:3000`).
- Production: the `Dockerfile` in `frontend/` builds static assets and serves them with `nginx`.

Local presentation (quick start)

If you want to run a local presentation with a seeded database and a served frontend, follow these steps from the repo root:

- Seed the database and start the backend:

```powershell
npm run seed
npm start
```

- Build and serve the frontend (in another terminal):

```powershell
npm --prefix frontend run build
npx http-server frontend/dist -p 5173
```

Or on Windows you can run the helper script (from repo root):

```powershell
./scripts/start-local.ps1
```

The API will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

## Production checklist

Follow this checklist before releasing to production.

- `JWT_SECRET` (required)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (if using Stripe)
- `SENDGRID_API_KEY` and `SENDGRID_LICENSE_TEMPLATE_ID` (if sending emails)
- `DATABASE_PATH` (path to SQLite file or use a managed DB)
- `CORS_ORIGINS` (allowed origins for the frontend; comma-separated)

```bash
npm run migrate
```

- When building the frontend for production set `VITE_API_BASE` to your API base URL (e.g. `https://api.example.com`) so the app points to the correct backend.
- The included release workflow pushes images to GitHub Container Registry (GHCR) using the `GITHUB_TOKEN`. If you prefer Docker Hub, add credentials to your repo secrets and update the workflow accordingly.
- Health checks are passing (`/health`)
- Metrics are available at `/metrics` if you expose them
- Keep sensitive secrets out of the image; provide them via your platform's secrets manager

## Rollback and backups

- Backup the SQLite DB before migrating or deploying: `cp data.sqlite data.sqlite.bak`
- Restore from backup if needed and redeploy previous image.

See [DEPLOYMENT.md](DEPLOYMENT.md) for a detailed production launch guide and checklist.

Free-hosting quickstart (Vercel + Fly.io)

- Frontend: connect the `frontend/` folder to Vercel. Set `VITE_API_BASE` in the project settings to your backend URL.
- Backend: use Fly.io with the included `fly.toml`. Create a persistent volume named `data` and set required secrets (e.g., `JWT_SECRET`, `STRIPE_*`, `CORS_ORIGINS`, `DATABASE_PATH=/data/data.sqlite`).

Windows build note: if you see native module build errors (e.g. installing `better-sqlite3`), install the "Desktop development with C++" workload from Visual Studio Build Tools or use Docker to build on Linux. See the DEPLOYMENT.md for CI/container options.

- CI: two deploy workflows were added: `.github/workflows/deploy-vercel.yml` and `.github/workflows/deploy-fly.yml`. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `FLY_API_TOKEN` to your repo secrets to enable auto-deploy on `main`.

See `docs/sendgrid.md` for SendGrid template setup.

## Cleanup & Private files

To keep the repo tidy and avoid committing secrets or large artifacts, follow these steps locally before committing:

- Generate one-time secrets (do NOT commit the file):

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
# copy values from .secrets.local into GitHub Secrets and then remove it
rm .secrets.local
```

- Remove local artifacts (coverage reports, local DB dumps) before committing:

```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

See `PRIVATE_FILES.md` for a list of files that must not be committed and `SECRETS_TO_SET.md` for exact secret names to configure in GitHub.

See `CONTRIBUTING.md` for contribution guidelines.

Webhooks

- Stripe webhooks: POST `/webhooks/stripe` expects raw JSON body and will verify signature when `STRIPE_WEBHOOK_SECRET` is set. On `checkout.session.completed` and `invoice.payment_succeeded` events the service creates orders and grants licenses for products that have `license: true`.

Testing webhooks locally

Security

- `CORS_ORIGINS`: comma-separated list of allowed origins (default `http://localhost:5173`).
- `AUTH_RATE_LIMIT_MAX`: number of allowed auth attempts per window (default `20`).
- Account lockout: repeated failed login attempts (default 5) will lock an account temporarily to mitigate brute-force attacks. Admin users can unlock accounts via the admin API.
- Content Security Policy (CSP) and other headers are applied via `helmet` to enforce a safer browser environment (HSTS is applied in non-test environments).

Admin endpoints

- `POST /admin/unlock` (admin only): unlocks a user's account. Body: `{ "username": "user@example.com" }`.
- `GET /admin/audits` (admin only): returns recent admin audit entries (unlock events and other admin actions).

You can test webhooks with a sample payload (use `curl`):

```bash
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"sess_test","metadata":{"productId":"<PRODUCT_ID>","username":"buyer@test"},"amount_total":500,"currency":"usd"}}}'
```

If you have `STRIPE_WEBHOOK_SECRET` set, use Stripe CLI to forward events and validate signatures:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

SendGrid template

- Example template is available at `docs/sendgrid-license-template.json` — create a dynamic template in SendGrid with the placeholders `license_key`, `product_name`, and `order_id`. Set `SENDGRID_LICENSE_TEMPLATE_ID` and `EMAIL_FROM` in environment variables to enable sending.
