-- =====================================================
-- CRM Contact / Deal logic: Deal-Contacts (link existing contacts only)
-- Database: crm_db_innopark
-- Contact = single source of truth in `contacts` table.
-- Deals link to one or more Contacts via deal_contacts (no duplicate contacts).
-- =====================================================

-- -----------------------------------------------------
-- 1. deal_contacts: many-to-many (deal_id, contact_id)
--    All contact_id reference `contacts.id` (master records only).
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `deal_contacts` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `deal_id` int(10) UNSIGNED NOT NULL,
  `contact_id` int(10) UNSIGNED NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `role` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_deal_contact` (`deal_id`, `contact_id`),
  KEY `idx_deal_contacts_deal` (`deal_id`),
  KEY `idx_deal_contacts_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: backfill from deals.contact_id if column exists and has values
-- INSERT IGNORE INTO deal_contacts (deal_id, contact_id, is_primary)
-- SELECT id, contact_id, 1 FROM deals WHERE contact_id IS NOT NULL AND is_deleted = 0;
