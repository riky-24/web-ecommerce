# Project Structure (high level)

- `src/` — backend source code (Express app)
- `frontend/` — React + Vite frontend
- `tests/` — Jest unit/integration tests
- `scripts/` — helper scripts (seeding, migrations, secrets, cleanup)
- `.github/workflows/` — CI/CD workflows
- `Dockerfile`, `docker-compose.yml`, `fly.toml` — deployment manifests

Key scripts:

- `npm run test` — run tests
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `scripts/seed-local.js` — seed local DB
- `scripts/migrate.js` — DB migration helper
- `scripts/generate-secrets.sh` — create `.secrets.local` with recommended keys
- `scripts/cleanup.sh` — remove local artifacts

See `README.md` for more details on running the app locally and deploying.
