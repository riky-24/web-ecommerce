# Security Notes & Action Items

This file summarizes the security review results and recommended mitigations.

Findings
- Dependency vulnerabilities found by `npm audit` (high severity):
  - `@sendgrid/mail` / `@sendgrid/client` pull in vulnerable `axios` versions in older releases.
  - `axios` earlier versions have DoS/SSRF/CSRF issues; ensure `axios >= 0.30.2` or latest 1.x.
  - `nodemon` (dev) depends on `simple-update-notifier`/`semver` with known issues.

- Webhook handling:
  - Stripe signature verification is implemented when `STRIPE_WEBHOOK_SECRET` is set.
  - QRIS provider adapters currently attempt to parse provider callbacks but do not verify signatures — implement provider-specific signature verification when available.

- Secrets & runtime config:
  - `JWT_SECRET` default dev fallback exists for convenience; this must be set in production (enforced by `src/config.js`).
  - Ensure `CORS_ORIGINS` is set to production frontends only.

Recommendations
- Upgrade dependencies to patched versions (CI will run `npm audit` and fail on high issues):
  - Upgrade `@sendgrid/mail` to >= `8.1.6` and `axios` to latest `1.x` in lockfile.
  - Update `nodemon` to `3.x` in dev dependencies.

- Webhooks:
  - Implement signature verification for Xendit / Midtrans webhooks and require webhook secret env vars in production.

- CI / Automation:
  - Dependabot or GitHub's auto-security updates should be enabled to automatically open PRs for dependency updates.
  - CI now runs `npm audit --audit-level=high` and will fail on high/critical vulnerabilities.

- Runtime Hardening:
  - Use least-privilege secrets in CI and deployment and rotate keys regularly.
  - Add monitoring/alerts for failed webhook attempts, high error rates, and suspicious traffic.

If you'd like, I can implement webhook signature verification for Xendit/Midtrans next, and enable Dependabot configuration for the repository.
