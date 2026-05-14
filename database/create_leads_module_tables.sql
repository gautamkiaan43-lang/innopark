-- =====================================================
-- Leads Module - Complete Database Schema
-- =====================================================

-- Contacts table (for Contacts tab)
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    lead_id INT NULL, -- Link to lead if converted from lead
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_type ENUM('Client', 'Vendor', 'Partner', 'Other') DEFAULT 'Client',
    assigned_user_id INT NULL,
    status ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company_id (company_id),
    INDEX idx_lead_id (lead_id),
    INDEX idx_assigned_user_id (assigned_user_id),
    INDEX idx_status (status),
    INDEX idx_contact_type (contact_type)
);

-- Lead Activities table (for activity timeline)
CREATE TABLE IF NOT EXISTS lead_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    lead_id INT NOT NULL,
    user_id INT NULL,
    activity_type ENUM('Call', 'Email', 'Meeting', 'Note', 'Status Change', 'Assignment', 'Follow-up', 'Other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company_id (company_id),
    INDEX idx_lead_id (lead_id),
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_date (activity_date)
);

-- Lead Status History table (for tracking status changes)
CREATE TABLE IF NOT EXISTS lead_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    lead_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT NULL,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company_id (company_id),
    INDEX idx_lead_id (lead_id),
    INDEX idx_new_status (new_status),
    INDEX idx_created_at (created_at)
);

-- Update leads table if needed (add missing columns)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- Run these manually if columns don't exist
-- ALTER TABLE leads ADD COLUMN priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium';
-- ALTER TABLE leads ADD COLUMN tags JSON NULL;
-- ALTER TABLE leads ADD COLUMN expected_value DECIMAL(15, 2) NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_due_followup ON leads(due_followup);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

