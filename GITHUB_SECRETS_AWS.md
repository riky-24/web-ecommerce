# Additional AWS / S3 secrets for backups

If you want the CI/workflows to upload automated backups to an S3 bucket, add these repository secrets:

- `AWS_ACCESS_KEY_ID`: IAM access key id with PutObject permission to the backup bucket
- `AWS_SECRET_ACCESS_KEY`: IAM secret access key
- `AWS_REGION`: region of the S3 bucket (e.g. `us-east-1`)
- `S3_BUCKET`: bucket name where backups will be stored

Notes:

- The `backup-to-s3` workflow streams the SQLite file from Fly's mounted volume via `flyctl ssh run` and uploads it directly to S3.
- Configure a lifecycle rule on the S3 bucket to prune old backups and enforce retention.
- Keep AWS credentials scoped to a dedicated IAM user/role and rotate keys regularly.

Usage:

- The script `scripts/restore-from-s3.sh` can be used locally or in CI to fetch a backup and restore it to `./data/data.sqlite`.

Security:

- Use minimal IAM permissions (PutObject/GetObject/ListBucket if needed) and avoid granting wildcard access.
