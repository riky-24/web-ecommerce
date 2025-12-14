# Files That MUST NOT Be Committed / Public

This file lists files and types of data that should never be committed to a public repository.

- `.env`, `.env.*` (local environment files)
- `.secrets.local` (one-time secret dump created by `scripts/generate-secrets.sh`)
- `data.sqlite` or `data.sqlite.json` (local DB dumps)
- Any files containing private keys, tokens, or credentials (AWS keys, Fly tokens, Vercel tokens, SendGrid keys, private keys, etc.)
- `coverage/` reports (build artifacts)
- `node_modules/` (do not commit)
- Backup artifacts, database snapshots, or exported files

If sensitive files have been committed accidentally, rotate the secrets immediately and consider using a history rewrite tool (BFG or `git filter-repo`) to purge secrets from history.

Recommended actions:

- Add these patterns to `.gitignore` (this repo already ignores many of them).
- Use GitHub Secrets and Environments for runtime configuration.
- Keep `.secrets.local` ephemeral and delete after use.
