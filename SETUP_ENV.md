# 🔧 Environment Setup Guide

## Create .env File

Since `.env` files are gitignored for security, you need to create it manually.

### Step 1: Create .env file

In the `worksuite-backend` directory, create a new file named `.env` and copy the following content:

```env
# =====================================================
# Worksuite CRM Backend Environment Configuration
# =====================================================

# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=crm_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=worksuite_crm_jwt_secret_key_2025_change_in_production
JWT_EXPIRE=24h

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx

# Email Configuration (Optional - for future use)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@worksuite.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Pagination Defaults
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Session Configuration
SESSION_SECRET=worksuite_session_secret_2025_change_in_production

# API Version
API_VERSION=v1

# Timezone
TZ=UTC
```

### Step 2: Update Database Credentials

Edit the `.env` file and update these values according to your MySQL setup:

```env
DB_HOST=localhost          # Your MySQL host
DB_USER=root               # Your MySQL username
DB_PASS=your_password      # Your MySQL password (leave empty if no password)
DB_NAME=crm_db             # Database name
```

### Step 3: Update JWT Secret (Important for Production)

For production, change the `JWT_SECRET` to a strong random string:

```env
JWT_SECRET=your_very_strong_random_secret_key_minimum_32_characters_long
```

You can generate a strong secret using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Update Frontend URL

If your frontend runs on a different port, update:

```env
FRONTEND_URL=http://localhost:5173  # Change port if different
```

---

## Quick Setup Commands

### Windows (PowerShell):
```powershell
cd worksuite-backend
@"
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=crm_db
DB_PORT=3306
JWT_SECRET=worksuite_crm_jwt_secret_key_2025_change_in_production
JWT_EXPIRE=24h
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx
FRONTEND_URL=http://localhost:5173
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
SESSION_SECRET=worksuite_session_secret_2025_change_in_production
API_VERSION=v1
TZ=UTC
"@ | Out-File -FilePath .env -Encoding utf8
```

### Linux/Mac:
```bash
cd worksuite-backend
cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=crm_db
DB_PORT=3306
JWT_SECRET=worksuite_crm_jwt_secret_key_2025_change_in_production
JWT_EXPIRE=24h
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx
FRONTEND_URL=http://localhost:5173
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
SESSION_SECRET=worksuite_session_secret_2025_change_in_production
API_VERSION=v1
TZ=UTC
EOF
```

---

## Environment Variables Explained

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `DB_HOST` | MySQL host | localhost | Yes |
| `DB_USER` | MySQL username | root | Yes |
| `DB_PASS` | MySQL password | (empty) | Yes* |
| `DB_NAME` | Database name | crm_db | Yes |
| `DB_PORT` | MySQL port | 3306 | No |
| `JWT_SECRET` | Secret for JWT tokens | (see above) | Yes |
| `JWT_EXPIRE` | Token expiration | 24h | No |
| `UPLOAD_DIR` | File upload directory | ./uploads | No |
| `MAX_FILE_SIZE` | Max file size in bytes | 10485760 (10MB) | No |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 | Yes |
| `API_VERSION` | API version | v1 | No |

*Leave empty if MySQL has no password

---

## Verification

After creating `.env`, verify it exists:

```bash
# Windows
dir .env

# Linux/Mac
ls -la .env
```

You should see the `.env` file listed.

---

## Security Notes

⚠️ **Important:**
- Never commit `.env` to git (already in `.gitignore`)
- Change `JWT_SECRET` in production
- Use strong passwords for production database
- Keep `.env` file secure and private

---

## Troubleshooting

### File Not Found Error
- Make sure `.env` file is in `worksuite-backend` directory
- Check file name is exactly `.env` (not `.env.txt`)

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `crm_db` exists

### Port Already in Use
- Change `PORT` in `.env` to different port (e.g., 5001)
- Or kill process using port 5000

---

**After creating `.env`, you can start the server:**
```bash
npm run dev
```

