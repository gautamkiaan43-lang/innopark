-- =====================================================
-- Dashboard Tables Schema
-- =====================================================

-- User Todos Table (Private To-do List)
CREATE TABLE IF NOT EXISTS user_todos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_completed TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_completed (is_completed),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sticky Notes Table (Private Notes)
CREATE TABLE IF NOT EXISTS user_sticky_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing
INSERT INTO user_todos (user_id, title, description, is_completed) VALUES
(1, 'Set roles and permissions for team members', NULL, 0),
(1, 'Setup notifications for tasks', NULL, 0),
(1, 'Re-arrange the widgets of my dashboard', NULL, 0),
(1, 'Setup IP restriction for time logs', NULL, 0),
(1, 'Discuss with team members', NULL, 0);

INSERT INTO user_sticky_notes (user_id, content) VALUES
(1, 'My quick notes here...');

-- =====================================================
-- Sample Data for Dashboard Demo
-- =====================================================

-- Sample Attendance (if not exists)
INSERT IGNORE INTO attendance (id, user_id, company_id, check_in, check_out, is_deleted) VALUES
(1, 1, 1, CONCAT(CURDATE(), ' 08:00:00'), NULL, 0);

-- Sample Announcements via notifications
INSERT IGNORE INTO notifications (id, company_id, user_id, type, message, is_deleted, created_at) VALUES
(999, 1, NULL, 'announcement', 'Tomorrow is holiday!', 0, NOW());

