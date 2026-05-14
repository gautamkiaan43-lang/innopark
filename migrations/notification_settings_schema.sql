-- =====================================================
-- Notification Settings Schema
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_key VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  notify_to JSON DEFAULT NULL COMMENT 'Array of user IDs or roles to notify',
  enable_email TINYINT(1) DEFAULT 0,
  enable_web TINYINT(1) DEFAULT 1,
  enable_slack TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_company_event (company_id, event_key),
  INDEX idx_company (company_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default notification events
INSERT INTO notification_settings (company_id, event_name, event_key, category, notify_to, enable_email, enable_web, enable_slack) VALUES
-- Contract events
(1, 'Contract accepted', 'contract_accepted', 'Contract', '["admin"]', 1, 1, 0),
(1, 'Contract rejected', 'contract_rejected', 'Contract', '["admin"]', 1, 1, 0),
(1, 'Contract sent', 'contract_sent', 'Contract', '["client"]', 1, 1, 0),

-- Estimate events
(1, 'Estimate sent', 'estimate_sent', 'Estimate', '["client"]', 1, 1, 0),
(1, 'Estimate accepted', 'estimate_accepted', 'Estimate', '["admin"]', 1, 1, 0),
(1, 'Estimate rejected', 'estimate_rejected', 'Estimate', '["admin"]', 1, 1, 0),
(1, 'Estimate request received', 'estimate_request_received', 'Estimate', '["admin"]', 1, 1, 0),
(1, 'Estimate commented', 'estimate_commented', 'Estimate', '["admin", "client"]', 0, 1, 0),

-- Event notifications
(1, 'Upcoming event', 'upcoming_event', 'Event', '["assigned"]', 1, 1, 0),

-- Invoice events
(1, 'Send invoice', 'send_invoice', 'Invoice', '["client"]', 1, 1, 0),
(1, 'Invoice payment confirmation', 'invoice_payment_confirmation', 'Invoice', '["admin", "client"]', 1, 1, 0),
(1, 'Invoice due reminder before due date', 'invoice_due_reminder', 'Invoice', '["client"]', 1, 1, 0),
(1, 'Invoice overdue reminder', 'invoice_overdue_reminder', 'Invoice', '["client"]', 1, 1, 0),
(1, 'Recurring invoice creation reminder', 'recurring_invoice_reminder', 'Invoice', '["admin"]', 1, 1, 0),
(1, 'Invoice manual payment added', 'invoice_manual_payment', 'Invoice', '["admin", "client"]', 1, 1, 0),
(1, 'Send credit note', 'send_credit_note', 'Invoice', '["client"]', 1, 1, 0),

-- Message events
(1, 'Message received', 'message_received', 'Message', '["recipient"]', 0, 1, 0),

-- Order events
(1, 'New order received', 'new_order_received', 'Order', '["admin"]', 1, 1, 0),
(1, 'Order status updated', 'order_status_updated', 'Order', '["client"]', 1, 1, 0),

-- Project events
(1, 'Project completed', 'project_completed', 'Project', '["admin", "client"]', 1, 1, 0),
(1, 'Project task deadline reminder', 'project_task_deadline', 'Project', '["assigned"]', 1, 1, 0),

-- Proposal events
(1, 'Proposal sent', 'proposal_sent', 'Proposal', '["client"]', 1, 1, 0),
(1, 'Proposal accepted', 'proposal_accepted', 'Proposal', '["admin"]', 1, 1, 0),
(1, 'Proposal rejected', 'proposal_rejected', 'Proposal', '["admin"]', 1, 1, 0),
(1, 'Proposal commented', 'proposal_commented', 'Proposal', '["admin", "client"]', 0, 1, 0),

-- Reminder events
(1, 'Upcoming reminder', 'upcoming_reminder', 'Reminder', '["assigned"]', 1, 1, 0),

-- Task events
(1, 'Task commented', 'task_commented', 'Task', '["assigned", "admin"]', 0, 1, 0),
(1, 'Task assigned', 'task_assigned', 'Task', '["assigned"]', 1, 1, 0),
(1, 'Task general', 'task_general', 'Task', '["assigned"]', 0, 1, 0),

-- Ticket events
(1, 'Ticket created', 'ticket_created', 'Ticket', '["admin"]', 1, 1, 0),
(1, 'Ticket commented', 'ticket_commented', 'Ticket', '["assigned", "client"]', 0, 1, 0),
(1, 'Ticket closed', 'ticket_closed', 'Ticket', '["client"]', 1, 1, 0),
(1, 'Ticket reopened', 'ticket_reopened', 'Ticket', '["admin"]', 1, 1, 0),

-- Client events
(1, 'New client added', 'client_added', 'Client', '["admin"]', 0, 1, 0),
(1, 'Client updated', 'client_updated', 'Client', '["admin"]', 0, 1, 0),

-- Announcement events
(1, 'New announcement', 'announcement_created', 'Announcement', '["all"]', 1, 1, 0);

