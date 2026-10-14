#!/usr/bin/env bash
#
# Seed the persistent Dokku storage of the Wanderlisi app from the old
# application (https://www.windmaster.ch/wanderlisi/).
#
# The storage is mounted in the container at /app/data, so it holds the whole
# `data/` tree the frontend reads: `tracks/` (GPX tracks, metadata, notes,
# images), `plans/` and the two top-level JSON files.
#
# This is a one-time migration and it is idempotent: it does nothing once the
# `tracks/` directory of the storage is populated, so tracks added afterwards
# by hand are never overwritten.
#
# Environment variables (all optional):
#   STORAGE_NAME  Dokku storage name          (default: wanderlisi-data)
#   OLD_DATA_URL  old application data root   (default: the public old site)
#   DOKKU_HOST    host to upload to           (default: system@cloudbox.chee.li)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORAGE_NAME="${STORAGE_NAME:-wanderlisi-data}"
OLD_DATA_URL="${OLD_DATA_URL:-https://www.windmaster.ch/wanderlisi/data}"
DOKKU_HOST="${DOKKU_HOST:-system@cloudbox.chee.li}"
STORAGE_DIR="/var/lib/dokku/data/storage/${STORAGE_NAME}"
SSH=(ssh -o StrictHostKeyChecking=no "$DOKKU_HOST")

# Already seeded? Leave it alone.
existing="$("${SSH[@]}" "sudo ls -A '${STORAGE_DIR}/tracks' 2>/dev/null" || true)"
if [ -n "$existing" ]; then
  echo "Storage '${STORAGE_NAME}' already contains tracks — skipping initialization."
  exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/data"

echo "Mirroring tracks from ${OLD_DATA_URL}/tracks ..."
python3 "$SCRIPT_DIR/mirror_old_data.py" "${OLD_DATA_URL}/tracks" "$WORK/data/tracks"

echo "Mirroring plans from ${OLD_DATA_URL}/plans ..."
python3 "$SCRIPT_DIR/mirror_old_data.py" "${OLD_DATA_URL}/plans" "$WORK/data/plans"

for file in historic-hotels.json sac-huts-selected.json; do
  echo "Downloading ${file} ..."
  curl -fsSL "${OLD_DATA_URL}/${file}" -o "$WORK/data/${file}"
done

tar -czf "$WORK/data.tgz" -C "$WORK/data" .

echo "Uploading to ${DOKKU_HOST}:${STORAGE_DIR} ..."
"${SSH[@]}" "sudo mkdir -p '${STORAGE_DIR}' \
  && sudo tar -xzf - -C '${STORAGE_DIR}' \
  && sudo chown -R 1000:1000 '${STORAGE_DIR}'" < "$WORK/data.tgz"

echo "Initialized '${STORAGE_NAME}' from the old application."
