# Database Migrations

This directory contains SQL and JS migration files for database schema changes.

## Run all migrations (recommended — local or Railway)

From the `backend` folder, with the same environment variables the app uses (`DATABASE_URL` / `MYSQL_URL`, or `MYSQLHOST`, `MYSQLUSER`, etc.):

```bash
cd backend
npm run migrate
# or: node run-all-migrations.js
```

Already-applied files are stored in the `schema_migrations` table, so the command is safe to run again on the same database.

**Railway (live database):** open your Railway project, copy the **MySQL** `DATABASE_URL` / connection variables, then either:

- Add them to `backend/.env` locally and run `npm run migrate`, or
- Use Railway’s shell: `railway run --service <mysql-or-app> npm run migrate` (from `backend` with `DATABASE_URL` linked), depending on your Railway layout.

## How to Run a Single Migration

### Option 1: MySQL command line
```bash
mysql -u root -p worksuite_db < migrations/001_add_package_id_to_companies.sql
```

### Option 2: MySQL Workbench or phpMyAdmin
1. Open the migration file
2. Copy the SQL statements
3. Execute them in your database

### Option 3: Node (single file)
```bash
node run-migration.js migrations/001_add_package_id_to_companies.sql
```

## Migration Files

### 001_add_package_id_to_companies.sql
- **Date**: 2024
- **Description**: Adds `package_id` column to `companies` table to link companies with company packages
- **Changes**:
  - Adds `package_id` INT UNSIGNED NULL column
  - Adds index `idx_company_package` for performance
  - Adds foreign key constraint (optional)

## Important Notes

- Always backup your database before running migrations
- Run migrations in order (by number)
- Check the verification query at the end of each migration file to confirm changes

