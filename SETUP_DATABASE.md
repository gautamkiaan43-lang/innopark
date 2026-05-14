# 🗄️ Database Setup Guide

## Problem: Tables don't exist

If you're getting errors like:
- `Table 'crm_db.invoices' doesn't exist`
- `Table 'crm_db.users' doesn't exist`
- `ER_NO_SUCH_TABLE`

This means you need to create all database tables first.

## ✅ Solution: Run Full Schema

### Method 1: Using phpMyAdmin (Recommended)

1. **Open phpMyAdmin**
2. **Select `crm_db` database** (or create it first if it doesn't exist)
3. **Click on "SQL" tab**
4. **Open `schema.sql` file** in a text editor
5. **Copy ALL content** from `schema.sql`
6. **Paste into phpMyAdmin SQL tab**
7. **Click "Go" button**
8. **Wait for execution** (may take 10-30 seconds)

### Method 2: Using MySQL Command Line

```bash
# Navigate to backend directory
cd worksuite-backend

# Run schema (replace root with your MySQL username)
mysql -u root -p crm_db < schema.sql

# Enter your MySQL password when prompted
```

### Method 3: Create Database First (If doesn't exist)

```sql
-- Run this first if database doesn't exist
CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Then run schema.sql
```

## 📋 What schema.sql Creates

The `schema.sql` file creates:

### Core Tables:
- ✅ `companies` - Multi-tenancy support
- ✅ `users` - Authentication & user management
- ✅ `roles`, `permissions`, `role_permissions` - Access control

### CRM Tables:
- ✅ `leads` - Lead management
- ✅ `clients` - Client management
- ✅ `client_contacts`, `client_managers`, `client_groups`, `client_labels`

### Work Tables:
- ✅ `projects` - Project management
- ✅ `tasks` - Task management
- ✅ `contracts` - Contract management
- ✅ `subscriptions` - Subscription management

### Finance Tables:
- ✅ `invoices` - Invoice management
- ✅ `invoice_items` - Invoice line items
- ✅ `estimates` - Estimate management
- ✅ `estimate_items` - Estimate line items
- ✅ `payments` - Payment records
- ✅ `expenses` - Expense management
- ✅ `expense_items` - Expense line items
- ✅ `credit_notes` - Credit note management

### Team Tables:
- ✅ `departments` - Department management
- ✅ `positions` - Position management
- ✅ `employees` - Employee records
- ✅ `attendance` - Attendance tracking
- ✅ `time_logs` - Time tracking
- ✅ `events` - Event management
- ✅ `leave_requests` - Leave management

### Communication Tables:
- ✅ `messages` - Internal messaging
- ✅ `message_recipients` - Message recipients
- ✅ `tickets` - Support tickets
- ✅ `ticket_comments` - Ticket comments
- ✅ `notifications` - System notifications

### System Tables:
- ✅ `custom_fields` - Dynamic custom fields
- ✅ `email_templates` - Email templates
- ✅ `finance_templates` - Finance templates
- ✅ `documents` - Document management
- ✅ `social_leads` - Social media leads
- ✅ `company_packages` - Package management
- ✅ `system_settings` - System settings
- ✅ `audit_logs` - Audit trail

**Total: 50+ tables with relationships and indexes**

## ✅ Verify Tables Created

After running schema.sql, verify tables exist:

### Option 1: phpMyAdmin
1. Select `crm_db` database
2. You should see 50+ tables listed

### Option 2: Run SQL Query
```sql
SELECT COUNT(*) as total_tables 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db';
```

Should return: **50+ tables**

### Option 3: Check Specific Table
```sql
SHOW TABLES LIKE 'invoices';
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'clients';
```

## 🚨 Troubleshooting

### Error: "Database doesn't exist"
```sql
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Error: "Table already exists"
- This is OK if you're re-running
- Schema.sql has `DROP TABLE IF EXISTS` statements
- It will recreate tables fresh

### Error: "Foreign key constraint fails"
- Make sure you run the ENTIRE schema.sql file
- Don't run parts separately
- Tables must be created in order

### Error: "Syntax error"
- Make sure you copied the ENTIRE schema.sql file
- Check for any truncation
- File should be ~1575 lines

### Error: "Access denied"
- Check MySQL user has CREATE privileges
- Use root user or grant privileges:
```sql
GRANT ALL PRIVILEGES ON crm_db.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📝 After Schema Creation

1. **Verify users exist:**
```sql
SELECT id, name, email, role FROM users WHERE is_deleted = 0;
```

2. **Test login:**
```json
POST http://localhost:5000/api/v1/auth/login
{
  "email": "admin@crmapp.com",
  "password": "Admin@123",
  "role": "ADMIN"
}
```

3. **Test dashboard:**
```json
GET http://localhost:5000/api/v1/dashboard/admin
Authorization: Bearer <your_token>
```

## 🎯 Quick Checklist

- [ ] Database `crm_db` exists
- [ ] Ran complete `schema.sql` file
- [ ] Verified 50+ tables created
- [ ] Verified 3 users exist (admin, employee, client)
- [ ] Tested login endpoint
- [ ] Tested dashboard endpoint

## 📞 Still Having Issues?

1. Check MySQL error logs
2. Verify MySQL version (should be 5.7+ or 8.0+)
3. Check file encoding (should be UTF-8)
4. Try running schema.sql in smaller chunks if file is too large

