#!/usr/bin/env bash
set -euo pipefail

echo "This script will remove local artifacts that should not be committed to the repo:"
echo " - coverage/"
echo " - data.sqlite.json"
echo " - .secrets.local"

read -p "Are you sure you want to continue? [y/N] " ans
if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
  echo "Aborted"
  exit 0
fi

echo "Removing coverage/"
rm -rf coverage || true

echo "Removing data.sqlite.json"
rm -f data.sqlite.json || true

echo "Removing .secrets.local"
rm -f .secrets.local || true
 
echo "Removing frontend/dist/"
rm -rf frontend/dist || true

echo "Done. Note: to remove these files from Git history, consider running a proper git cleanup (e.g., git rm --cached, or BFG / git filter-repo)."
