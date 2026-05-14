# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v16+)
- MySQL (v8.0+)
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies
```bash
cd worksuite-backend
npm install
```

### 2. Create Database
```bash
mysql -u root -p
```
Then run:
```sql
CREATE DATABASE crm_db;
exit;
```

### 3. Import Schema
```bash
mysql -u root -p crm_db < schema.sql
```

### 4. Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit .env and update:
# DB_HOST=localhost
# DB_USER=root
# DB_PASS=your_mysql_password
# DB_NAME=crm_db
# JWT_SECRET=your_strong_secret_here
```

### 5. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Test API
```bash
# Health check
curl http://localhost:5000/health

# Login (default admin)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crmapp.com",
    "password": "Admin@123",
    "role": "ADMIN"
  }'
```

## Default Credentials
- **Email:** `admin@crmapp.com`
- **Password:** `Admin@123`
- **Role:** `ADMIN`

## API Base URL
`http://localhost:5000/api/v1`

## Postman Collection
Import `crm-apis.postman_collection.json` into Postman for easy testing.

## Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill`

### Module Not Found
- Run `npm install` again
- Check `package.json` dependencies

## Next Steps
1. Test all endpoints using Postman
2. Integrate with frontend
3. Deploy to production

---

**Ready to go!** 🎉

