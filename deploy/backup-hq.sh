#!/usr/bin/env bash
# Automated Backup Script untuk AI Virtual HQ (24/7 Homelab)
# Pasang di cron harian: 30 23 * * * /opt/Karyawan-Luxvite/deploy/backup-hq.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/ai-virtual-hq}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/hq-backup-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

tar -czf "$OUT_FILE" \
  -C "$APP_DIR" \
  --ignore-failed-read \
  config memory reports daily-content skills 2>/dev/null || true

# Hapus arsip lebih tua dari KEEP_DAYS hari
find "$BACKUP_DIR" -name "hq-backup-*.tar.gz" -type f -mtime +"$KEEP_DAYS" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup selesai: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# Opsional: aktifkan jika memakai rclone ke Google Drive / Backblaze / S3
# rclone copy "$OUT_FILE" gdrive:Homelab-Backups/ai-virtual-hq/
