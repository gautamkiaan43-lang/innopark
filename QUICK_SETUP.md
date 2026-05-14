# 🚀 Quick Setup Guide - Insert Users

## Problem: Users table is empty

If your `users` table is empty, follow these steps:

## Method 1: Using phpMyAdmin (Easiest)

1. Open phpMyAdmin
2. Select `crm_db` database
3. Click on **SQL** tab
4. Copy and paste the entire content from `insert_users.sql` file
5. Click **Go** button
6. You should see success messages and 3 users inserted

## Method 2: Using MySQL Command Line

```bash
mysql -u root -p crm_db < insert_users.sql
```

## Method 3: Run Full Schema (If tables don't exist)

If you need to create all tables first:

```bash
mysql -u root -p crm_db < schema.sql
```

## After Inserting Users

### Test Login Credentials:

**Admin:**
- Email: `admin@crmapp.com`
- Password: `Admin@123`
- Role: `ADMIN`

**Employee:**
- Email: `employee@demo.com`
- Password: `Demo@123`
- Role: `EMPLOYEE`

**Client:**
- Email: `client@demo.com`
- Password: `Demo@123`
- Role: `CLIENT`

### Test in Postman:

```json
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@crmapp.com",
  "password": "Admin@123",
  "role": "ADMIN"
}
```

Expected Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "company_id": 1,
    "name": "Super Admin",
    "email": "admin@crmapp.com",
    "role": "ADMIN"
  }
}
```

## Troubleshooting

### If you get "Duplicate entry" error:
- The users already exist
- Use `update_passwords.sql` instead to update passwords

### If you get "Table doesn't exist" error:
- Run the full `schema.sql` first to create all tables

### If login still fails:
1. Check password hash matches in database
2. Verify role is exactly 'ADMIN', 'EMPLOYEE', or 'CLIENT'
3. Check user status is 'Active'
4. Check `is_deleted` is 0

## Verify Users in Database

Run this SQL query in phpMyAdmin:

```sql
SELECT id, name, email, role, status, 
       LENGTH(password) as password_length,
       created_at
FROM users 
WHERE is_deleted = 0
ORDER BY id;
```

You should see 3 users with password_length = 60 (bcrypt hash length).

