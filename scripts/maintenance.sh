#!/usr/bin/env bash
set -euo pipefail

echo "Running project maintenance: format, lint --fix, test"

npm run format
npm run lint || true
npm test

echo "Maintenance complete"
