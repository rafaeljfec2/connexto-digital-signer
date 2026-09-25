#!/usr/bin/env sh
set -eu

# Run once against the shared Outcoders MinIO (container name: minio).
# Requires the official mc client and production S3 credentials in the environment.

if [ -z "${S3_ACCESS_KEY_ID:-}" ] || [ -z "${S3_SECRET_ACCESS_KEY:-}" ]; then
  echo "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required" >&2
  exit 1
fi

S3_ENDPOINT="${S3_ENDPOINT:-http://minio:9000}"
S3_BUCKET="${S3_BUCKET:-connexto-signer}"

mc alias set signer "${S3_ENDPOINT}" "${S3_ACCESS_KEY_ID}" "${S3_SECRET_ACCESS_KEY}"
mc mb --ignore-existing "signer/${S3_BUCKET}"
echo "Bucket ${S3_BUCKET} is ready"
