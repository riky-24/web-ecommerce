# Changelog

## Unreleased

- Add QRIS mock payment provider and backend endpoints for create/poll/confirm (create-qris, qris-status, qris-callback).
- Add `category` and `qrisId` to products and `paymentMethod`/`paymentId` to orders; migration script `scripts/migrate-qris.js` added.
- Seed templates for game products, topups, and tools (`scripts/seed-local.js`).
- Frontend `Storefront` updated to show product categories and QRIS checkout flow (QR modal + polling).
- Tests: add `tests/checkout-qris.test.js`.
- Docs: QRIS env var recommendations, migration instructions, Windows build guidance, and improved secret generation instructions.
- Misc: lint fixes and project cleanup.
