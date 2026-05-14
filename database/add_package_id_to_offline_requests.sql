-- Add package_id column to offline_requests table
ALTER TABLE offline_requests 
ADD COLUMN package_id INT NULL AFTER company_id,
ADD FOREIGN KEY (package_id) REFERENCES company_packages(id) ON DELETE SET NULL,
ADD INDEX idx_package_id (package_id);

