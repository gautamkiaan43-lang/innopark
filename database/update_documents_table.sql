-- =====================================================
-- Documents Table - Add client_id column
-- =====================================================

-- Add client_id column if not exists
ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_id INT NULL;

-- Add foreign key constraint
ALTER TABLE documents ADD CONSTRAINT fk_documents_client 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);

-- Also ensure lead_id and project_id columns exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS lead_id INT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id INT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

