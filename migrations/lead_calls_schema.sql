-- =====================================================
-- Lead Call Logs Schema
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_calls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    lead_id INT NOT NULL,
    call_date DATE NOT NULL,
    call_time TIME,
    phone_number VARCHAR(50) NOT NULL,
    call_type ENUM('Incoming', 'Outgoing') DEFAULT 'Outgoing',
    duration_minutes INT DEFAULT 0,
    subject VARCHAR(255),
    message TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead_calls_lead_id (lead_id),
    INDEX idx_lead_calls_company_id (company_id),
    INDEX idx_lead_calls_call_date (call_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;









