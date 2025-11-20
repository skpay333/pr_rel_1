#!/bin/bash

# Database Import Script for Romax Pay
# Usage: bash scripts/import-database.sh <backup-file.sql>

if [ $# -eq 0 ]; then
  echo "❌ Error: Please provide backup file path"
  echo "Usage: bash scripts/import-database.sh <backup-file.sql>"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "🔄 Starting database import..."
echo "📁 File: $BACKUP_FILE"
echo ""
echo "⚠️  WARNING: This will overwrite existing data!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Import cancelled"
  exit 0
fi

echo "📦 Importing database..."
psql $DATABASE_URL < $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Database imported successfully!"
else
  echo "❌ Import failed!"
  exit 1
fi
