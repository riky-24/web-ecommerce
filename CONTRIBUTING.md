# Contributing

Thanks for contributing! A few guidelines to keep the project healthy and easy to work with.

- Branches: feature branches should be `feature/<name>`, fixes `fix/<issue>`, and PRs should target `main`.
- Commit messages: use conventional commits (e.g., `feat:`, `fix:`, `chore:`) to make changelogs easier.
- Lint & Format: run:
  ```bash
  npm run lint
  npm run format
  ```
  Prefer `npm run format` before commits; CI will run linters on push.
- Tests: run `npm test`. Add tests for new features/bug fixes.
- Pull Requests: describe the change, reference issue numbers, and include a short test plan.

Dependency updates:

- To create a dependency bump PR locally (useful if you have a `GITHUB_TOKEN` with repo scope):

```bash
# generate a token in GitHub and export it as env var
export GITHUB_TOKEN=ghp_...
node scripts/open-dep-prs.js
```

This script will run `npx npm-check-updates -u` in the project root and `frontend`, update lockfiles, push a branch, and open a PR using the GitHub API.

If you see sensitive data in the repo, raise an issue privately or contact the repo owner.
