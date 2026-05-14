# Worksuite CRM Backend

Backend API for Worksuite CRM & Operations Suite built with Node.js, Express, and MySQL.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd worksuite-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update database credentials and JWT secret.

4. **Create database**
   ```bash
   mysql -u root -p < schema.sql
   ```

5. **Start the server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
worksuite-backend/
├── config/
│   └── db.js                 # MySQL connection pool
├── middleware/
│   └── auth.js               # JWT authentication middleware
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── leadRoutes.js
│   └── ...                   # Other route files
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── leadController.js
│   └── ...                   # Other controller files
├── uploads/                  # File uploads directory
├── schema.sql                # MySQL database schema
├── .env                      # Environment variables
├── .env.example              # Environment variables template
├── package.json
├── server.js                 # Express app entry point
└── README.md
```

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Default Admin Credentials
After running `schema.sql`, you can login with:
- Email: `admin@crmapp.com`
- Password: `Admin@123`
- Role: `ADMIN`

## 📡 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

### Dashboard
- `GET /dashboard/admin` - Admin dashboard stats
- `GET /dashboard/employee` - Employee dashboard stats
- `GET /dashboard/client` - Client dashboard stats

### Modules
See `crm-apis.postman_collection.json` for complete API documentation.

## 🗄️ Database

The database schema includes:
- **Auth & Org**: users, companies, roles, permissions
- **CRM**: leads, clients, client_contacts
- **Work**: projects, tasks, contracts, subscriptions
- **Finance**: invoices, estimates, payments, expenses, credit_notes
- **Team**: employees, attendance, time_logs, events, departments, positions
- **Communication**: messages, tickets, notifications
- **Tools**: custom_fields, email_templates, finance_templates, documents
- **System**: audit_logs, system_settings, company_packages

All tables include:
- `id` (Primary Key)
- `company_id` (Multi-tenancy)
- `created_at`, `updated_at` (Timestamps)
- `is_deleted` (Soft delete)

## 🔒 Security Features

- JWT authentication
- Password hashing with bcryptjs
- SQL injection prevention (parameterized queries)
- CORS protection
- Rate limiting
- Helmet.js security headers
- Input validation

## 📝 Code Style

- **NO ORM** - Raw SQL with `mysql2/promise`
- **All queries parameterized** - Prevents SQL injection
- **Try/catch in every controller** - Proper error handling
- **Consistent JSON responses** - `{ success: true/false, data/error: ... }`
- **Snake_case in database** - `user_id`, `created_at`
- **CamelCase in JavaScript** - `userId`, `createdAt` (converted in controllers)

## 🧪 Testing

Import `crm-apis.postman_collection.json` into Postman for API testing.

## 📄 License

ISC

## 🤝 Contributing

1. Follow the code style guidelines
2. Use parameterized SQL queries
3. Add proper error handling
4. Update Postman collection if adding new endpoints

---

**Generated:** 2025-12-21  
**Based on:** Frontend UI Analysis

