# Database Migration Notes

This project uses SQLite for persistence. On startup the application will attempt to perform _safe, additive_ migrations to the `products` table so deployments can be upgraded in-place. Read this file before upgrading production.

## Changes added by the migration

- Added product columns (all additive):
  - `currency` (TEXT) — currency code, default `usd`
  - `license` (INTEGER) — 0 or 1, whether product is a license
  - `type` (TEXT) — `one-time` or `subscription`
  - `interval` (TEXT) — billing interval for subscriptions, e.g. `month`
  - `stripeId` (TEXT) — remote Stripe product id
  - `updatedAt` (TEXT) — ISO timestamp for last update

## How the app migrates

On application start the `db` module checks the `products` table and runs `ALTER TABLE` statements to add missing columns. These are idempotent for existing deployments (they check if the column exists before adding).

## Manual migration steps (if you prefer to run manually)

1. Backup your database file (important):

```powershell
copy data.sqlite data.sqlite.bak
```

2. Run the ALTER TABLE statements using `sqlite3` or a GUI:

```sql
ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'usd';
ALTER TABLE products ADD COLUMN license INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'one-time';
ALTER TABLE products ADD COLUMN interval TEXT;
ALTER TABLE products ADD COLUMN stripeId TEXT;
ALTER TABLE products ADD COLUMN updatedAt TEXT;
```

3. Restart the application (if it was running).

## Rollback

If anything goes wrong restore your DB backup and roll back the app to the previous release.

## Notes

- This migration is intentionally additive and non-destructive. It sets default values where appropriate.
- Make sure to set any new environment variables your deployment requires and test the application in staging before production.
