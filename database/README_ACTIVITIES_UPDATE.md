# Activities Table Update - Task and Comment Types

## Overview
This update adds support for 'task' and 'comment' activity types to the activities table, enabling the Activity Timeline tabs feature in the CRM.

## Migration Steps

### Option 1: Run SQL Directly
Execute the SQL file directly in your database:

```bash
mysql -u your_username -p crm_db < database/update_activities_table_add_task_comment.sql
```

Or via phpMyAdmin:
1. Select your database
2. Go to SQL tab
3. Paste the contents of `update_activities_table_add_task_comment.sql`
4. Execute

### Option 2: Run Migration Script
```bash
node migrations/update_activities_add_task_comment.js
```

## What This Does

1. **Updates ENUM Type**: Modifies the `type` column in `activities` table to include:
   - Existing: `call`, `meeting`, `note`, `email`
   - New: `task`, `comment`

2. **Backward Compatible**: All existing activities remain valid. No data loss.

## Verification

After running the migration, verify with:

```sql
SHOW COLUMNS FROM activities WHERE Field = 'type';
```

You should see:
```
ENUM('call','meeting','note','email','task','comment')
```

## API Changes

The backend controller (`activityController.js`) has been updated to:
- Validate new activity types (`task`, `comment`)
- Support creating activities with these new types
- Maintain backward compatibility with existing types

## Frontend Integration

The frontend ActivityTimeline component now supports:
- **Activity Tab**: Shows all activities
- **Comment Tab**: Filters to show only comments
- **Task Tab**: Filters to show only tasks
- **Email Tab**: Filters to show only emails
- **Call Tab**: Filters to show only calls
- **Meeting Tab**: Filters to show only meetings

## Notes

- This is a safe migration - no data will be lost
- Existing activities continue to work
- New activity types can be created immediately after migration

