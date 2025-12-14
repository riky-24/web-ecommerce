#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <s3-key> [dest-path]"
  echo "Example: $0 backups/microservice-data-20251201T020000Z.sqlite ./data/data.sqlite"
  exit 1
fi

S3_KEY="$1"
DEST="${2:-./data/data.sqlite}"

if [ -z "${S3_BUCKET:-}" ]; then
  echo "Environment variable S3_BUCKET must be set or provide full s3 key path."
  exit 1
fi

echo "Downloading s3://$S3_BUCKET/$S3_KEY to $DEST"
aws s3 cp "s3://$S3_BUCKET/$S3_KEY" "$DEST"
echo "Restore complete"
