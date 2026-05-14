# 🚀 Postman Quick Reference - API Endpoints

## Base URL
```
http://localhost:5000/api/v1
```

---

## 🔐 Authentication (No Token Required)

### Login
```
POST /auth/login
```
**Payload:**
```json
{
  "email": "admin@crmapp.com",
  "password": "Admin@123",
  "role": "ADMIN"
}
```

**Response:** `{ "success": true, "token": "...", "user": {...} }`

---

## 👥 Users (Admin Only - Token Required)

### Get All Users
```
GET /users?page=1&pageSize=10
Header: Authorization: Bearer {token}
```

### Create User
```
POST /users
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "EMPLOYEE",
  "status": "Active"
}
```

---

## 👔 Employees (Token Required)

### Get All Employees
```
GET /employees?page=1&pageSize=10
Header: Authorization: Bearer {token}
```

### Create Employee
```
POST /employees
Header: Authorization: Bearer {admin_token}
```
**Payload:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "Employee123!",
  "role": "Developer",
  "department_id": 1,
  "position_id": 1,
  "status": "Active"
}
```

**Note:** Employee create करते समय automatically user account भी create होता है।

---

## 🏢 Clients (Token Required)

### Get All Clients
```
GET /clients?page=1&pageSize=10
Header: Authorization: Bearer {token}
```

### Create Client (Admin Only)
```
POST /clients
Header: Authorization: Bearer {admin_token}
```
**Payload:**
```json
{
  "company_name": "Tech Solutions Inc",
  "owner_id": 1,
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "United States",
  "phone_country_code": "+1",
  "phone_number": "555-0100",
  "website": "https://techsolutions.com",
  "currency": "USD",
  "status": "Active"
}
```

### Add Contact to Client
```
POST /clients/{id}/contacts
Header: Authorization: Bearer {admin_token}
```
**Payload:**
```json
{
  "name": "Jane Smith",
  "email": "jane@techsolutions.com",
  "phone": "+1-555-0101",
  "job_title": "Project Manager",
  "is_primary": true
}
```

---

## 📋 Projects (Token Required)

### Get All Projects
```
GET /projects?page=1&pageSize=10
Header: Authorization: Bearer {token}
```

### Create Project (Admin Only)
```
POST /projects
Header: Authorization: Bearer {admin_token}
```
**Payload:**
```json
{
  "project_name": "Website Redesign",
  "client_id": 1,
  "description": "Complete website redesign",
  "start_date": "2025-01-20",
  "end_date": "2025-03-20",
  "status": "In Progress",
  "budget": 50000,
  "currency": "USD",
  "project_members": [2, 3, 4]
}
```

---

## ✅ Tasks (Token Required)

### Get All Tasks
```
GET /tasks?page=1&pageSize=10&status=Incomplete
Header: Authorization: Bearer {token}
```

### Create Task
```
POST /tasks
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "title": "Design homepage mockup",
  "project_id": 1,
  "start_date": "2025-01-20",
  "due_date": "2025-01-25",
  "status": "Incomplete",
  "assigned_to": 2,
  "description": "Create mockup for homepage",
  "priority": "High",
  "estimated_hours": 8
}
```

### Update Task Status
```
PUT /tasks/{id}
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "status": "Doing"
}
```

---

## 💰 Invoices (Token Required)

### Get All Invoices
```
GET /invoices?page=1&pageSize=10&client_id=1
Header: Authorization: Bearer {token}
```

### Create Invoice
```
POST /invoices
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "invoice_number": "INV#001",
  "invoice_date": "2025-01-20",
  "due_date": "2025-02-20",
  "client_id": 1,
  "project_id": 1,
  "status": "Unpaid",
  "currency": "USD",
  "items": [
    {
      "item_name": "Web Development",
      "description": "Website development services",
      "quantity": 40,
      "unit": "Hours",
      "unit_price": 100,
      "tax": "GST 10%",
      "tax_rate": 10,
      "amount": 4400
    }
  ]
}
```

---

## 📊 Estimates (Token Required)

### Get All Estimates
```
GET /estimates?page=1&pageSize=10
Header: Authorization: Bearer {token}
```

### Create Estimate
```
POST /estimates
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "estimate_number": "EST#001",
  "valid_till": "2025-02-20",
  "client_id": 1,
  "project_id": 1,
  "status": "Waiting",
  "currency": "USD",
  "items": [
    {
      "item_name": "Design Services",
      "quantity": 20,
      "unit": "Hours",
      "unit_price": 150,
      "tax_rate": 10,
      "amount": 3300
    }
  ]
}
```

### Convert Estimate to Invoice
```
POST /estimates/{id}/convert-to-invoice
Header: Authorization: Bearer {token}
```
**Payload:**
```json
{
  "invoice_date": "2025-01-20",
  "due_date": "2025-02-20"
}
```

---

## 🏢 Departments (Token Required)

### Get All Departments
```
GET /departments
Header: Authorization: Bearer {token}
```

### Create Department (Admin Only)
```
POST /departments
Header: Authorization: Bearer {admin_token}
```
**Payload:**
```json
{
  "name": "Marketing",
  "head_id": 2,
  "description": "Marketing department"
}
```

---

## 📈 Dashboard (Token Required)

### Get Dashboard Stats
```
GET /dashboard/stats
Header: Authorization: Bearer {token}
```

---

## 🔑 Test Credentials

### Admin
- Email: `admin@crmapp.com`
- Password: `Admin@123`
- Role: `ADMIN`

### Employee
- Email: `employee@demo.com`
- Password: `Demo@123`
- Role: `EMPLOYEE`

### Client
- Email: `client@demo.com`
- Password: `Demo@123`
- Role: `CLIENT`

---

## 📝 Postman Setup Tips

1. **Environment Variables:**
   - `base_url`: `http://localhost:5000/api/v1`
   - `admin_token`: Login के बाद token save करें

2. **Pre-request Script:**
   ```javascript
   pm.request.headers.add({
       key: "Authorization",
       value: "Bearer " + pm.environment.get("admin_token")
   });
   ```

3. **Test Sequence:**
   1. Login → Token save करें
   2. Create User (if needed)
   3. Create Employee/Client
   4. Create Project
   5. Create Task
   6. Create Invoice/Estimate

---

## ⚠️ Common Errors

- **401 Unauthorized:** Token missing या invalid
- **403 Forbidden:** Admin role required
- **400 Bad Request:** Required fields missing
- **404 Not Found:** Resource not found

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-01-20

