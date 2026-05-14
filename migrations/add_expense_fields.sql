-- Migration: Add new fields to expenses table for simplified expense form
-- Date: 2026-01-03

-- Add new columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT NULL AFTER expense_number,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL AFTER expense_date,
ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0 AFTER category,
ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL AFTER amount,
ADD COLUMN IF NOT EXISTS client_id INT DEFAULT NULL AFTER lead_id,
ADD COLUMN IF NOT EXISTS project_id INT DEFAULT NULL AFTER client_id,
ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL AFTER project_id,
ADD COLUMN IF NOT EXISTS tax VARCHAR(50) DEFAULT NULL AFTER description,
ADD COLUMN IF NOT EXISTS second_tax VARCHAR(50) DEFAULT NULL AFTER tax,
ADD COLUMN IF NOT EXISTS is_recurring TINYINT(1) DEFAULT 0 AFTER second_tax;

-- Add foreign key constraints (optional - may fail if data doesn't match)
-- ALTER TABLE expenses ADD CONSTRAINT fk_expense_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
-- ALTER TABLE expenses ADD CONSTRAINT fk_expense_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
-- ALTER TABLE expenses ADD CONSTRAINT fk_expense_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
