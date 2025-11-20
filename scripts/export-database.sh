#!/bin/bash

# Database Export Script for Romax Pay
# Usage: bash scripts/export-database.sh

echo "🔄 Starting database export..."

# Create exports directory if it doesn't exist
mkdir -p exports

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="exports/romax_pay_backup_${TIMESTAMP}.sql"

# Export database
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "📦 Exporting database to: $FILENAME"
pg_dump $DATABASE_URL > $FILENAME

if [ $? -eq 0 ]; then
  echo "✅ Database exported successfully!"
  echo "📁 File: $FILENAME"
  echo ""
  echo "📋 File size: $(du -h $FILENAME | cut -f1)"
  echo ""
  echo "⚠️  IMPORTANT:"
  echo "   - Do NOT commit this file to public GitHub"
  echo "   - Store it securely or use private repository"
  echo "   - To restore: psql \$DATABASE_URL < $FILENAME"
else
  echo "❌ Export failed!"
  exit 1
fi
