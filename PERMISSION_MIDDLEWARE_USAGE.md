# Permission Middleware Usage Guide

## Overview
The permission middleware checks if a user has the required permissions (can_view, can_add, can_edit, can_delete) for a specific module before allowing access to API endpoints.

## How It Works

1. **Automatic Permission Detection**: The middleware automatically determines the required permission based on HTTP method:
   - `GET` → `can_view`
   - `POST` → `can_add`
   - `PUT/PATCH` → `can_edit`
   - `DELETE` → `can_delete`

2. **Module Detection**: The middleware extracts the module name from the route path (e.g., `/api/v1/proposals` → `proposals`)

3. **Role-Based Check**: It checks the user's role and looks up permissions in the `role_permissions` table

4. **Bypass Rules**: 
   - `SUPERADMIN` and `ADMIN` roles bypass all permission checks
   - Other roles must have explicit permissions

## Usage Examples

### Basic Usage (Automatic Module Detection)

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/proposalController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Apply authentication first
router.use(verifyToken);

// Apply permission middleware - module is auto-detected from path
router.get('/', requirePermission(), controller.getAll);
router.post('/', requirePermission(), controller.create);
router.put('/:id', requirePermission(), controller.update);
router.delete('/:id', requirePermission(), controller.delete);
```

### Explicit Module Name

```javascript
// Specify module name explicitly
router.get('/', requirePermission('proposals'), controller.getAll);
router.post('/', requirePermission('proposals'), controller.create);
```

### Specific Permission Types

```javascript
const { canView, canAdd, canEdit, canDelete } = require('../middleware/permissions');

router.get('/', canView('proposals'), controller.getAll);
router.post('/', canAdd('proposals'), controller.create);
router.put('/:id', canEdit('proposals'), controller.update);
router.delete('/:id', canDelete('proposals'), controller.delete);
```

## Complete Route Example

```javascript
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(verifyToken);

// Apply permission checks
router.get('/filters', requirePermission('invoices'), invoiceController.getFilters);
router.get('/', requirePermission('invoices'), invoiceController.getAll);
router.get('/:id', requirePermission('invoices'), invoiceController.getById);
router.post('/', requirePermission('invoices'), invoiceController.create);
router.put('/:id', requirePermission('invoices'), invoiceController.update);
router.delete('/:id', requirePermission('invoices'), invoiceController.delete);
```

## Error Responses

### No Permission
```json
{
  "success": false,
  "error": "Access denied. You don't have view permission for proposals"
}
```

### Role Not Found
```json
{
  "success": false,
  "error": "Role 'CLIENT' not found or no permissions configured"
}
```

### Not Authenticated
```json
{
  "success": false,
  "error": "Authentication required"
}
```

## Module Name Mapping

The middleware maps route paths to module names. Common mappings:

- `/api/v1/proposals` → `proposals`
- `/api/v1/invoices` → `invoices`
- `/api/v1/clients` → `clients`
- `/api/v1/projects` → `projects`
- `/api/v1/tasks` → `tasks`
- `/api/v1/payments` → `payments`
- `/api/v1/contracts` → `contracts`
- `/api/v1/employees` → `employees`
- `/api/v1/attendance` → `attendance`
- `/api/v1/leaves` → `leaves`
- `/api/v1/events` → `events`
- `/api/v1/messages` → `messages`
- `/api/v1/tickets` → `tickets`
- `/api/v1/documents` → `documents`

## Important Notes

1. **Always apply `verifyToken` first** before permission middleware
2. **SUPERADMIN and ADMIN bypass** all permission checks
3. **Module names must match** the `module` column in `role_permissions` table
4. **Permissions are company-specific** - each company has its own role permissions

## Testing Permissions

1. Create a role (e.g., "Sales Manager")
2. Set permissions for that role in Role Permissions page
3. Assign the role to a user
4. Test API calls - they should respect the permissions set

## Migration Guide

To add permissions to existing routes:

1. Import the middleware:
```javascript
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
```

2. Add authentication:
```javascript
router.use(verifyToken);
```

3. Add permission checks:
```javascript
router.get('/', requirePermission('module_name'), controller.getAll);
router.post('/', requirePermission('module_name'), controller.create);
router.put('/:id', requirePermission('module_name'), controller.update);
router.delete('/:id', requirePermission('module_name'), controller.delete);
```
