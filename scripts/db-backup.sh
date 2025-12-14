#!/usr/bin/env bash
# Simple sqlite backup script (copies DB and optionally uploads to S3 if configured)
set -euo pipefail
DB_PATH=${DATABASE_PATH:-data.sqlite}
TS=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="${DB_PATH}.${TS}.bak"
cp "$DB_PATH" "$BACKUP_FILE"
echo "Backed up $DB_PATH -> $BACKUP_FILE"

# Optional s3 upload
if [ -n "${AWS_S3_BUCKET:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BUCKET}/db-backups/$(basename $BACKUP_FILE)"
    echo "Uploaded $BACKUP_FILE to s3://${AWS_S3_BUCKET}"
  else
    echo "aws cli not found; skipping s3 upload"
  fi
fi
