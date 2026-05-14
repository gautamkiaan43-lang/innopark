# 🚀 Postman API Test Guide

## Base URL
```
http://localhost:5000/api/v1
```

---

## 🔐 1. Authentication APIs

### 1.1 Login (Admin)
**POST** `/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "admin@crmapp.com",
  "password": "Admin@123",
  "role": "ADMIN"
}
```

**Response:**
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

---

### 1.2 Login (Employee)
**POST** `/auth/login`

**Body (JSON):**
```json
{
  "email": "employee@demo.com",
  "password": "Demo@123",
  "role": "EMPLOYEE"
}
```

---

### 1.3 Login (Client)
**POST** `/auth/login`

**Body (JSON):**
```json
{
  "email": "client@demo.com",
  "password": "Demo@123",
  "role": "CLIENT"
}
```

---

### 1.4 Get Current User
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 1.5 Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 👥 2. User Management APIs

### 2.1 Get All Users (Admin Only)
**GET** `/users?page=1&pageSize=10`

**Headers:**
```
Authorization: Bearer {admin_token}
```

---

### 2.2 Create User (Admin Only)
**POST** `/users`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "role": "EMPLOYEE",
  "status": "Active",
  "phone": "+1-555-0100",
  "address": "123 Main St, New York"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "EMPLOYEE",
    "status": "Active"
  }
}
```

---

### 2.3 Reset Password (Admin Only)
**POST** `/users/{id}/reset-password`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

---

## 👔 3. Employee APIs

### 3.1 Get All Employees
**GET** `/employees?page=1&pageSize=10`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "employee_number": "EMP001",
      "name": "Demo Employee",
      "email": "employee@demo.com",
      "department_name": "Sales",
      "position_name": "Manager",
      "role": "Manager",
      "status": "Active"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
}
```

---

### 3.2 Create Employee (Admin Only)
**POST** `/employees`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "user_id": 4,
  "employee_number": "EMP002",
  "department_id": 1,
  "position_id": 1,
  "role": "Developer",
  "status": "Active",
  "joining_date": "2025-01-20"
}
```

**Note:** पहले user account create करें, फिर employee record create करें।

---

## 🏢 4. Client APIs

### 4.1 Get All Clients
**GET** `/clients?page=1&pageSize=10`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 4.2 Get Client By ID
**GET** `/clients/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 4.3 Create Client (Admin Only)
**POST** `/clients`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "company_name": "Tech Solutions Inc",
  "owner_id": 1,
  "managers": [2, 3],
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "United States",
  "phone_country_code": "+1",
  "phone_number": "555-0100",
  "website": "https://techsolutions.com",
  "vat_number": "VAT123456",
  "gst_number": "GST123456",
  "currency": "USD",
  "currency_symbol": "$",
  "disable_online_payment": false,
  "status": "Active",
  "groups": ["Enterprise"],
  "labels": ["Technology"]
}
```

---

### 4.4 Update Client (Admin Only)
**PUT** `/clients/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):** (Same as Create, but only include fields to update)

---

### 4.5 Delete Client (Admin Only)
**DELETE** `/clients/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
```

---

### 4.6 Add Contact to Client (Admin Only)
**POST** `/clients/{id}/contacts`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Jane Smith",
  "job_title": "Project Manager",
  "email": "jane.smith@techsolutions.com",
  "phone": "+1-555-0101",
  "is_primary": true
}
```

---

### 4.7 Get Client Contacts
**GET** `/clients/{id}/contacts`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 📋 5. Project APIs

### 5.1 Get All Projects
**GET** `/projects?page=1&pageSize=10`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 5.2 Get Project By ID
**GET** `/projects/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 5.3 Create Project (Admin Only)
**POST** `/projects`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "project_name": "Website Redesign",
  "client_id": 1,
  "description": "Complete website redesign project",
  "start_date": "2025-01-20",
  "end_date": "2025-03-20",
  "status": "In Progress",
  "budget": 50000,
  "currency": "USD",
  "project_members": [2, 3, 4]
}
```

---

### 5.4 Update Project (Admin Only)
**PUT** `/projects/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):** (Same as Create)

---

### 5.5 Delete Project (Admin Only)
**DELETE** `/projects/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
```

---

## ✅ 6. Task APIs

### 6.1 Get All Tasks
**GET** `/tasks?page=1&pageSize=10&status=Incomplete`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10)
- `status` - Filter by status (optional)
- `project_id` - Filter by project (optional)
- `assigned_to` - Filter by assignee (optional)

---

### 6.2 Get Task By ID
**GET** `/tasks/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 6.3 Create Task
**POST** `/tasks`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
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

---

### 6.4 Update Task
**PUT** `/tasks/{id}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "Doing",
  "hours_logged": 4
}
```

---

### 6.5 Delete Task
**DELETE** `/tasks/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 💰 7. Invoice APIs

### 7.1 Get All Invoices
**GET** `/invoices?page=1&pageSize=10&client_id=1`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 7.2 Get Invoice By ID
**GET** `/invoices/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 7.3 Create Invoice
**POST** `/invoices`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "invoice_number": "INV#001",
  "invoice_date": "2025-01-20",
  "due_date": "2025-02-20",
  "client_id": 1,
  "project_id": 1,
  "status": "Unpaid",
  "currency": "USD",
  "exchange_rate": 1,
  "discount": 0,
  "discount_type": "%",
  "billing_address": "123 Client St, New York",
  "shipping_address": "123 Client St, New York",
  "note": "Thank you for your business",
  "terms": "Net 30",
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

### 7.4 Update Invoice
**PUT** `/invoices/{id}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):** (Same as Create)

---

### 7.5 Delete Invoice
**DELETE** `/invoices/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 📊 8. Estimate APIs

### 8.1 Get All Estimates
**GET** `/estimates?page=1&pageSize=10&status=Waiting`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 8.2 Get Estimate By ID
**GET** `/estimates/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 8.3 Create Estimate
**POST** `/estimates`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "estimate_number": "EST#001",
  "valid_till": "2025-02-20",
  "client_id": 1,
  "project_id": 1,
  "status": "Waiting",
  "currency": "USD",
  "discount": 0,
  "discount_type": "%",
  "description": "Project estimate",
  "note": "Please review",
  "terms": "Valid for 30 days",
  "items": [
    {
      "item_name": "Design Services",
      "description": "UI/UX Design",
      "quantity": 20,
      "unit": "Hours",
      "unit_price": 150,
      "tax": "GST 10%",
      "tax_rate": 10,
      "amount": 3300
    }
  ]
}
```

---

### 8.4 Update Estimate
**PUT** `/estimates/{id}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

### 8.5 Delete Estimate
**DELETE** `/estimates/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 8.6 Convert Estimate to Invoice
**POST** `/estimates/{id}/convert-to-invoice`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "invoice_date": "2025-01-20",
  "due_date": "2025-02-20"
}
```

---

## 🏢 9. Department APIs

### 9.1 Get All Departments
**GET** `/departments`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 9.2 Create Department (Admin Only)
**POST** `/departments`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Marketing",
  "head_id": 2,
  "description": "Marketing department"
}
```

---

## 📈 10. Dashboard APIs

### 10.1 Get Dashboard Stats
**GET** `/dashboard/stats`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_projects": 10,
    "active_projects": 5,
    "total_tasks": 50,
    "pending_tasks": 15,
    "total_invoices": 20,
    "unpaid_invoices": 5,
    "total_revenue": 100000,
    "pending_revenue": 25000
  }
}
```

---

## 🔍 Important Notes

### Authentication Token
- Login करने के बाद मिलने वाला `token` को सभी protected APIs में use करें
- Header में add करें: `Authorization: Bearer {token}`

### Common Response Format
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## 📝 Postman Collection Setup

### Environment Variables
Postman में environment variables set करें:

```
base_url: http://localhost:5000/api/v1
admin_token: (login करने के बाद token यहाँ save करें)
employee_token: (employee login token)
client_token: (client login token)
```

### Pre-request Script (Token Auto-set)
```javascript
// Auto-set token from environment
if (pm.environment.get("admin_token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("admin_token")
    });
}
```

---

## 🧪 Quick Test Sequence

1. **Login as Admin**
   - POST `/auth/login` with admin credentials
   - Save token to environment variable

2. **Create User**
   - POST `/users` (create employee user)

3. **Create Employee**
   - POST `/employees` (link to user)

4. **Create Client**
   - POST `/clients`

5. **Create Project**
   - POST `/projects`

6. **Create Task**
   - POST `/tasks`

7. **Create Invoice**
   - POST `/invoices`

---

**Last Updated:** 2025-01-20
**Version:** 1.0

