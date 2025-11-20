# 📦 Database Migration Guide for Romax Pay

This guide explains how to migrate your Romax Pay database when moving the application to another Replit account or external service.

## 🎯 Quick Start

### Export Database (Current Project)
```bash
bash scripts/export-database.sh
```
This creates a backup file in `exports/` directory with timestamp.

### Import Database (New Project)
```bash
bash scripts/import-database.sh exports/romax_pay_backup_YYYYMMDD_HHMMSS.sql
```

---

## 📋 Migration Scenarios

### Scenario 1: Replit → Another Replit Account

**Step 1: In Current Project**
```bash
# Export database
bash scripts/export-database.sh

# Download the backup file from exports/ directory
# Or commit to PRIVATE GitHub repository
```

**Step 2: In New Replit Project**
```bash
# Clone your repository
git clone <your-repo-url>

# Create PostgreSQL database in Replit UI
# (Tools → Database → Create PostgreSQL Database)

# Upload backup file if downloaded, or pull from git

# Import database
bash scripts/import-database.sh exports/romax_pay_backup_*.sql
```

**Step 3: Update Configuration**
```bash
# Ensure all secrets are configured:
# - BOT_TOKEN
# - BOT_OPER_TOKEN
# - ADMIN_PASSWORD
# DATABASE_URL is auto-created by Replit

# Run database schema sync
npm run db:push

# Start application
npm run dev
```

---

### Scenario 2: Replit → External Service (Heroku, Railway, etc.)

**Step 1: Export from Replit**
```bash
bash scripts/export-database.sh
```

**Step 2: Setup New Service**
- Create PostgreSQL database on new service
- Get DATABASE_URL from new service

**Step 3: Import to New Service**
```bash
# Using new service's DATABASE_URL
psql <NEW_SERVICE_DATABASE_URL> < exports/romax_pay_backup_*.sql
```

**Step 4: Deploy Application**
```bash
# Configure environment variables on new service:
# - DATABASE_URL (from new service)
# - BOT_TOKEN
# - BOT_OPER_TOKEN
# - ADMIN_PASSWORD
# - SESSION_SECRET (generate new)
# - WEBAPP_URL (your new deployment URL)

# Deploy code
git push <new-service> main
```

---

### Scenario 3: External Service → Replit

**Step 1: Export from External Service**
```bash
# Connect to your external database and export
pg_dump <EXTERNAL_DATABASE_URL> > external_backup.sql
```

**Step 2: Import to Replit**
```bash
# In Replit project:
# 1. Create PostgreSQL database via UI
# 2. Upload external_backup.sql
# 3. Import:
bash scripts/import-database.sh external_backup.sql
```

---

## 🔧 Manual Export/Import Commands

### Full Database Export (Schema + Data)
```bash
pg_dump $DATABASE_URL > full_backup.sql
```

### Data Only Export
```bash
pg_dump $DATABASE_URL --data-only --inserts > data_only.sql
```

### Schema Only Export
```bash
pg_dump $DATABASE_URL --schema-only > schema_only.sql
```

### Import Database
```bash
psql $DATABASE_URL < backup.sql
```

### Direct Database Transfer
```bash
# Transfer directly from old to new database
pg_dump $OLD_DATABASE_URL | psql $NEW_DATABASE_URL
```

---

## 🛠️ Using PostgreSQL GUI Clients

### DBeaver (Free)
1. Download: https://dbeaver.io/
2. Create new PostgreSQL connection
3. Paste DATABASE_URL from Replit Secrets
4. Export: Right-click database → Tools → Export Data

### pgAdmin (Free)
1. Download: https://www.pgadmin.org/
2. Add new server
3. Parse DATABASE_URL:
   - Host: from PGHOST
   - Port: from PGPORT
   - Database: from PGDATABASE
   - Username: from PGUSER
   - Password: from PGPASSWORD
4. Backup: Right-click database → Backup

### TablePlus (Paid)
1. Download: https://tableplus.com/
2. Create connection using DATABASE_URL
3. Export: File → Export

---

## ⚠️ Important Security Notes

### DO NOT:
- ❌ Commit backup.sql files to **public** GitHub repositories
- ❌ Share DATABASE_URL publicly
- ❌ Include backups in Docker images
- ❌ Store backups in public cloud storage

### DO:
- ✅ Use **private** repositories for backups
- ✅ Encrypt backup files if storing remotely
- ✅ Delete local backups after migration
- ✅ Keep backups in secure locations
- ✅ Add `*.sql` to .gitignore (already done)

---

## 🔍 Verify Migration Success

After importing database, verify:

```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt"

# Count users
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Count deposits
psql $DATABASE_URL -c "SELECT COUNT(*) FROM deposits;"

# Count payments
psql $DATABASE_URL -c "SELECT COUNT(*) FROM payment_requests;"

# Check operators
psql $DATABASE_URL -c "SELECT COUNT(*) FROM operators;"
```

---

## 📊 Database Size Check

```bash
# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Check table sizes
psql $DATABASE_URL -c "
  SELECT 
    tablename, 
    pg_size_pretty(pg_total_relation_size(tablename::text)) AS size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(tablename::text) DESC;
"
```

---

## 🚨 Troubleshooting

### Problem: Import fails with "relation already exists"
**Solution:** Drop existing tables first:
```bash
# Warning: This deletes all data!
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < backup.sql
```

### Problem: Permission denied errors
**Solution:** Ensure DATABASE_URL has full permissions

### Problem: Different PostgreSQL versions
**Solution:** Use `--no-owner --no-privileges` flags:
```bash
pg_dump $DATABASE_URL --no-owner --no-privileges > backup.sql
```

---

## 📞 Need Help?

If you encounter issues:
1. Check Replit documentation: https://docs.replit.com/
2. Verify DATABASE_URL is set correctly
3. Ensure PostgreSQL client tools are installed
4. Check database logs for specific error messages

---

## 🔄 Automated Backups

For production, consider setting up automated backups:

```bash
# Add to crontab (external server) or use Replit scheduled tasks
0 2 * * * bash /path/to/scripts/export-database.sh
```

Or use Replit's built-in point-in-time restore feature (available in database settings).
