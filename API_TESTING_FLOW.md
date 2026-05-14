# 🚀 Complete API Testing Flow Guide
## Step-by-Step API Testing Sequence for Worksuite Application

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Complete Testing Flow](#complete-testing-flow)
3. [API Testing Order](#api-testing-order)
4. [Feature Flow Sequence](#feature-flow-sequence)

---

## 🔧 Prerequisites

### 1. Backend Server Setup
```bash
cd worksuite-backend
npm install
npm start
# Server should run on http://localhost:5000
```

### 2. Frontend Server Setup
```bash
cd worksuite-frontend
npm install
npm run dev
# Frontend should run on http://localhost:5173
```

### 3. Database Setup
- Ensure MySQL database is running
- Database should be configured in `worksuite-backend/config/db.js`

---

## 🎯 Complete Testing Flow

### **PHASE 1: Authentication & User Setup** (Foundation)

#### Step 1: Login as Admin
**API:** `POST /api/v1/auth/login`
```json
{
  "email": "admin@crmapp.com",
  "password": "Admin@123",
  "role": "ADMIN"
}
```
**Why First:** Admin has full access, needed to create other users and setup data

**Expected Response:**
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
**Save Token:** Copy the token for all subsequent API calls

---

#### Step 2: Get Current User Info
**API:** `GET /api/v1/auth/me`
**Headers:** `Authorization: Bearer {token}`

**Why:** Verify authentication is working correctly

---

#### Step 3: Create User Accounts
**API:** `POST /api/v1/users`
**Headers:** `Authorization: Bearer {admin_token}`

**Create Employee User:**
```json
{
  "name": "John Employee",
  "email": "john.employee@demo.com",
  "password": "Employee@123",
  "role": "EMPLOYEE",
  "status": "Active",
  "phone": "+1-555-0100",
  "address": "123 Employee St"
}
```

**Create Client User:**
```json
{
  "name": "Jane Client",
  "email": "jane.client@demo.com",
  "password": "Client@123",
  "role": "CLIENT",
  "status": "Active",
  "phone": "+1-555-0200",
  "address": "456 Client Ave"
}
```

**Why:** Need users before creating employees/clients

---

#### Step 4: Create Departments
**API:** `POST /api/v1/departments`
**Headers:** `Authorization: Bearer {admin_token}`

**Create Sample Departments:**
```json
{
  "name": "Sales",
  "head_id": 2,
  "description": "Sales department"
}
```

```json
{
  "name": "Development",
  "head_id": 2,
  "description": "Development department"
}
```

**Why:** Departments needed for creating employees

---

#### Step 5: Create Employee Records
**API:** `POST /api/v1/employees`
**Headers:** `Authorization: Bearer {admin_token}`

**Note:** First create user (Step 3), then create employee record

```json
{
  "user_id": 2,
  "employee_number": "EMP001",
  "department_id": 1,
  "position_id": 1,
  "role": "Manager",
  "status": "Active",
  "joining_date": "2025-01-20"
}
```

**Why:** Employees needed for assigning projects, tasks, and as client owners

---

### **PHASE 2: Client Management** (Core Business Data)

#### Step 6: Create Clients
**API:** `POST /api/v1/clients`
**Headers:** `Authorization: Bearer {admin_token}`

**Create First Client:**
```json
{
  "company_name": "Tech Solutions Inc",
  "owner_id": 1,
  "managers": [2],
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

**Why:** Clients are core to the system - needed for projects, invoices, estimates

---

#### Step 7: Get All Clients
**API:** `GET /api/v1/clients?page=1&pageSize=10`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify client creation and see list

---

#### Step 8: Get Client by ID
**API:** `GET /api/v1/clients/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test single client retrieval

---

#### Step 9: Add Contact to Client
**API:** `POST /api/v1/clients/{id}/contacts`
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "name": "Jane Smith",
  "job_title": "Project Manager",
  "email": "jane.smith@techsolutions.com",
  "phone": "+1-555-0101",
  "is_primary": true
}
```

**Why:** Clients need contacts for communication

---

#### Step 10: Get Client Contacts
**API:** `GET /api/v1/clients/{id}/contacts`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify contacts were added

---

### **PHASE 3: Project Management** (Project Setup)

#### Step 11: Create Projects
**API:** `POST /api/v1/projects`
**Headers:** `Authorization: Bearer {admin_token}`

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
  "project_members": [2, 3]
}
```

**Why:** Projects are central - needed for tasks, invoices, estimates

---

#### Step 12: Get All Projects
**API:** `GET /api/v1/projects?page=1&pageSize=10`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify project creation

---

#### Step 13: Get Project by ID
**API:** `GET /api/v1/projects/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test single project retrieval

---

### **PHASE 4: Task Management** (Work Tracking)

#### Step 14: Create Tasks
**API:** `POST /api/v1/tasks`
**Headers:** `Authorization: Bearer {admin_token}`

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

**Why:** Tasks track work within projects

---

#### Step 15: Get All Tasks
**API:** `GET /api/v1/tasks?page=1&pageSize=10&status=Incomplete`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify task creation and filtering

---

#### Step 16: Update Task Status
**API:** `PUT /api/v1/tasks/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "status": "Doing",
  "hours_logged": 4
}
```

**Why:** Test task updates and status changes

---

### **PHASE 5: Financial Management** (Billing & Estimates)

#### Step 17: Create Estimates
**API:** `POST /api/v1/estimates`
**Headers:** `Authorization: Bearer {admin_token}`

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

**Why:** Estimates come before invoices - client approves estimate first

---

#### Step 18: Get All Estimates
**API:** `GET /api/v1/estimates?page=1&pageSize=10&status=Waiting`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify estimate creation

---

#### Step 19: Convert Estimate to Invoice
**API:** `POST /api/v1/estimates/{id}/convert-to-invoice`
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "invoice_date": "2025-01-20",
  "due_date": "2025-02-20"
}
```

**Why:** Natural flow - approved estimates become invoices

---

#### Step 20: Create Invoices
**API:** `POST /api/v1/invoices`
**Headers:** `Authorization: Bearer {admin_token}`

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

**Why:** Invoices bill clients for completed work

---

#### Step 21: Get All Invoices
**API:** `GET /api/v1/invoices?page=1&pageSize=10&client_id=1`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Verify invoice creation

---

#### Step 22: Update Invoice Status
**API:** `PUT /api/v1/invoices/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "status": "Paid"
}
```

**Why:** Track payment status

---

### **PHASE 6: Dashboard & Reports** (Overview)

#### Step 23: Get Dashboard Stats
**API:** `GET /api/v1/dashboard/stats`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** See overall system statistics

**Expected Response:**
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

### **PHASE 7: Role & Permissions Management** (Advanced Access Control)

#### Step 24: Get All Roles (If API exists)
**API:** `GET /api/v1/roles` (if implemented)
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Manage custom roles and permissions

**Note:** Currently Roles & Permissions UI is commented out. This is for future implementation.

---

#### Step 25: Create Custom Role (If API exists)
**API:** `POST /api/v1/roles` (if implemented)
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "name": "Project Manager",
  "permissions": {
    "leads": ["view", "edit"],
    "clients": ["view", "edit", "create"],
    "projects": ["view", "edit", "create", "delete"],
    "tasks": ["view", "edit", "create"],
    "invoices": ["view"],
    "reports": ["view"]
  }
}
```

**Why:** Create custom roles with specific permissions

---

#### Step 26: Assign Role to User (If API exists)
**API:** `PUT /api/v1/users/{id}/role` (if implemented)
**Headers:** `Authorization: Bearer {admin_token}`

```json
{
  "role_id": 2
}
```

**Why:** Assign custom roles to users

---

### **PHASE 8: Testing Other Roles** (Role-Based Access)

#### Step 27: Login as Employee
**API:** `POST /api/v1/auth/login`
```json
{
  "email": "employee@demo.com",
  "password": "Demo@123",
  "role": "EMPLOYEE"
}
```

**Save Token:** Copy employee token for testing

**Test Employee Access:**

**✅ Allowed Operations:**
- `GET /api/v1/tasks?assigned_to={employee_id}` - View assigned tasks
- `PUT /api/v1/tasks/{id}` - Update own task status
- `GET /api/v1/projects` - View assigned projects
- `GET /api/v1/employees/{id}` - View own profile
- `POST /api/v1/time-tracking` - Log time

**❌ Should Fail (403 Forbidden):**
- `POST /api/v1/clients` - Cannot create clients
- `POST /api/v1/invoices` - Cannot create invoices
- `DELETE /api/v1/projects/{id}` - Cannot delete projects
- `GET /api/v1/users` - Cannot view all users

**Employee Menu Flow (UI Testing):**
1. Dashboard → View employee dashboard
2. My Tasks → View assigned tasks → Update status
3. My Projects → View assigned projects
4. Time Tracking → Log work hours
5. Calendar → View events
6. My Profile → View/Edit own profile
7. Attendance → Mark attendance
8. Leave Requests → Request leave
9. Messages → Send/Receive messages
10. Notifications → View notifications

---

#### Step 28: Login as Client
**API:** `POST /api/v1/auth/login`
```json
{
  "email": "client@demo.com",
  "password": "Demo@123",
  "role": "CLIENT"
}
```

**Save Token:** Copy client token for testing

**Test Client Access:**

**✅ Allowed Operations:**
- `GET /api/v1/projects?client_id={client_id}` - View own projects
- `GET /api/v1/invoices?client_id={client_id}` - View own invoices
- `GET /api/v1/estimates?client_id={client_id}` - View own estimates
- `GET /api/v1/tasks?project_id={project_id}` - View project tasks
- `GET /api/v1/clients/{id}` - View own client profile
- `POST /api/v1/payments` - Make payments

**❌ Should Fail (403 Forbidden):**
- `POST /api/v1/projects` - Cannot create projects
- `POST /api/v1/tasks` - Cannot create tasks
- `DELETE /api/v1/invoices/{id}` - Cannot delete invoices
- `GET /api/v1/users` - Cannot view users
- `GET /api/v1/employees` - Cannot view employees

**Client Menu Flow (UI Testing):**
1. Dashboard → View client dashboard
2. Contracts → View contracts
3. Projects → View assigned projects → View project details
4. Tasks → View project tasks
5. Estimates → View estimates → Approve/Reject
6. Invoices → View invoices → Make payment
7. Payments → View payment history
8. Credit Notes → View credit notes
9. Profile → View/Edit own profile
10. Notifications → View notifications
11. Settings → Update settings

---

### **PHASE 9: Update & Delete Operations** (CRUD Complete)

#### Step 29: Update Client
**API:** `PUT /api/v1/clients/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test update functionality

---

#### Step 30: Update Project
**API:** `PUT /api/v1/projects/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test project updates

---

#### Step 31: Delete Task
**API:** `DELETE /api/v1/tasks/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test delete functionality

---

#### Step 32: Delete Invoice
**API:** `DELETE /api/v1/invoices/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test invoice deletion

---

#### Step 33: Delete Estimate
**API:** `DELETE /api/v1/estimates/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test estimate deletion

---

#### Step 34: Delete Project
**API:** `DELETE /api/v1/projects/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test project deletion

---

#### Step 35: Delete Client
**API:** `DELETE /api/v1/clients/{id}`
**Headers:** `Authorization: Bearer {admin_token}`

**Why:** Test client deletion (be careful - may have dependencies)

---

## 📊 Complete Feature Flow Sequence

### **UI Menu Flow - ADMIN (Frontend Testing Order):**

1. **Login Page** → Select Admin Role → Login
2. **Dashboard** → View overview stats
3. **CRM & Sales**
   - **Leads** → Create leads → Convert to clients
   - **Clients** → Create clients → Add contacts → View details
4. **Work**
   - **Projects** → Create projects → Assign members → View project details
   - **Tasks** → Create tasks → Assign to employees → Update status
5. **Finance**
   - **Estimates** → Create estimates → Send to client → Convert to invoice
   - **Invoices** → Create invoices → Mark as paid → View reports
   - **Payments** → View payment history
   - **Expenses** → Add expenses → View reports
6. **Team & Operations**
   - **Employees** → Create employees → Assign to departments
   - **Departments** → Create departments
   - **Positions** → Create positions
   - **Time Tracking** → View time logs
   - **Attendance** → View attendance reports
   - **Calendar** → Create events
7. **Communication**
   - **Messages** → Send messages to team
   - **Tickets** → Create tickets → Assign → Resolve
8. **Users & Roles**
   - **Staff Management** → Create users → Assign roles
   - **Roles & Permissions** → (Currently commented out - for future)
9. **Dashboard** → View updated stats

---

### **UI Menu Flow - EMPLOYEE (Frontend Testing Order):**

1. **Login Page** → Select Employee Role → Login
2. **Dashboard** → View employee dashboard
3. **My Tasks** → View assigned tasks → Update status → Log time
4. **My Projects** → View assigned projects → View project details
5. **Time Tracking** → Log work hours → View time reports
6. **Calendar** → View events → Create personal events
7. **My Profile** → View/Edit profile → Update information
8. **My Documents** → Upload documents → View documents
9. **Attendance** → Mark attendance → View attendance history
10. **Leave Requests** → Request leave → View leave status
11. **Messages** → Send/Receive messages
12. **Notifications** → View notifications
13. **Settings** → Update settings

---

### **UI Menu Flow - CLIENT (Frontend Testing Order):**

1. **Login Page** → Select Client Role → Login
2. **Dashboard** → View client dashboard
3. **Contracts** → View contracts → Download contracts
4. **Projects** → View assigned projects → View project details → View progress
5. **Tasks** → View project tasks → View task status
6. **Estimates** → View estimates → Approve/Reject estimates
7. **Invoices** → View invoices → Download invoices → Make payment
8. **Payments** → View payment history → View receipts
9. **Credit Notes** → View credit notes
10. **Profile** → View/Edit profile → Update company information
11. **Notifications** → View notifications
12. **Settings** → Update settings

---

## 🎯 Role-Based Menu Access Summary

### **ADMIN Menu Access:**
- ✅ Full access to all menus
- ✅ Can create/edit/delete everything
- ✅ Can manage users, roles, permissions
- ✅ Can view all reports and analytics
- ❌ Roles & Permissions menu currently commented out

### **EMPLOYEE Menu Access:**
- ✅ Dashboard
- ✅ My Tasks (assigned tasks only)
- ✅ My Projects (assigned projects only)
- ✅ Time Tracking
- ✅ Calendar
- ✅ My Profile
- ✅ My Documents
- ✅ Attendance
- ✅ Leave Requests
- ✅ Messages
- ✅ Notifications
- ✅ Settings
- ❌ Cannot access: Clients, Invoices, Users, Reports (admin only)

### **CLIENT Menu Access:**
- ✅ Dashboard
- ✅ Contracts
- ✅ Projects (own projects only)
- ✅ Tasks (project tasks only)
- ✅ Estimates (own estimates only)
- ✅ Invoices (own invoices only)
- ✅ Payments
- ✅ Credit Notes
- ✅ Profile
- ✅ Notifications
- ✅ Settings
- ❌ Cannot access: Employees, Users, Reports, System Settings

---

## 🎯 Quick Testing Checklist

### ✅ Phase 1: Foundation (Steps 1-5)
- [ ] Login as Admin
- [ ] Get current user
- [ ] Create users
- [ ] Create departments
- [ ] Create employees

### ✅ Phase 2: Core Data (Steps 6-10)
- [ ] Create clients
- [ ] Get clients list
- [ ] Get client details
- [ ] Add client contacts
- [ ] Get client contacts

### ✅ Phase 3: Projects (Steps 11-13)
- [ ] Create projects
- [ ] Get projects list
- [ ] Get project details

### ✅ Phase 4: Tasks (Steps 14-16)
- [ ] Create tasks
- [ ] Get tasks list
- [ ] Update task status

### ✅ Phase 5: Financial (Steps 17-22)
- [ ] Create estimates
- [ ] Get estimates list
- [ ] Convert estimate to invoice
- [ ] Create invoices
- [ ] Get invoices list
- [ ] Update invoice status

### ✅ Phase 6: Dashboard (Step 23)
- [ ] Get dashboard stats

### ✅ Phase 7: Role & Permissions (Steps 24-26)
- [ ] Get all roles (if API exists)
- [ ] Create custom role (if API exists)
- [ ] Assign role to user (if API exists)

### ✅ Phase 8: Roles Testing (Steps 27-28)
- [ ] Login as Employee
- [ ] Test Employee allowed operations
- [ ] Test Employee forbidden operations
- [ ] Login as Client
- [ ] Test Client allowed operations
- [ ] Test Client forbidden operations

### ✅ Phase 9: CRUD Complete (Steps 29-35)
- [ ] Update operations
- [ ] Delete operations

---

## 🔑 Important Notes

1. **Always save the token** from login response for subsequent API calls
2. **Use correct headers:** `Authorization: Bearer {token}`
3. **Follow the order** - some APIs depend on data created in previous steps
4. **Check IDs** - Use actual IDs returned from create operations
5. **Test error cases** - Try invalid data, missing fields, unauthorized access

---

## 📝 Postman Collection Setup

### Environment Variables:
```
base_url: http://localhost:5000/api/v1
admin_token: (save after admin login)
employee_token: (save after employee login)
client_token: (save after client login)
```

### Pre-request Script (Auto-set Token):
```javascript
if (pm.environment.get("admin_token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("admin_token")
    });
}
```

---

## 🚨 Common Issues & Solutions

1. **401 Unauthorized:** Token expired or missing - Login again
2. **404 Not Found:** Wrong endpoint or ID - Check API documentation
3. **400 Bad Request:** Missing required fields - Check request body
4. **500 Server Error:** Backend issue - Check server logs

---

**Last Updated:** 2025-01-23
**Version:** 1.0

---

## 📞 Support

If you encounter issues:
1. Check server logs in backend console
2. Verify database connection
3. Check API endpoint URLs
4. Verify token is valid
5. Check request/response format matches documentation

