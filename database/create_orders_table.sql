-- =====================================================
-- Create Orders Table
-- =====================================================

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NULL,
  `invoice_id` INT UNSIGNED NULL,
  `title` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('New', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Shipped', 'Delivered') NOT NULL DEFAULT 'New',
  `order_date` DATE NULL DEFAULT (CURRENT_DATE),
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_client_id` (`client_id`),
  INDEX `idx_invoice_id` (`invoice_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_order_date` (`order_date`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Create Order Items Table
-- =====================================================

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` INT UNSIGNED NOT NULL,
  `item_id` INT UNSIGNED NULL,
  `item_name` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unit` VARCHAR(50) NULL DEFAULT 'PC',
  `unit_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_item_id` (`item_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

