-- ====================================================================
-- Cleanup Legacy Activity Mappings and Foreign Keys to Prevent Leakage
-- ====================================================================

-- 1. Align entity_type and entity_id with the most specific foreign key
UPDATE activities 
SET 
  entity_type = CASE 
    WHEN deal_id IS NOT NULL THEN 'deal'
    WHEN contact_id IS NOT NULL THEN 'contact'
    WHEN lead_id IS NOT NULL THEN 'lead'
    WHEN company_id IS NOT NULL THEN 'company'
    ELSE entity_type
  END,
  entity_id = CASE 
    WHEN deal_id IS NOT NULL THEN deal_id
    WHEN contact_id IS NOT NULL THEN contact_id
    WHEN lead_id IS NOT NULL THEN lead_id
    WHEN company_id IS NOT NULL THEN company_id
    ELSE entity_id
  END
WHERE is_deleted = 0;

-- 2. Strictly isolate Deal activities: Clear contact_id, lead_id, company_id
UPDATE activities
SET 
  contact_id = NULL,
  lead_id = NULL,
  company_id = NULL
WHERE deal_id IS NOT NULL AND is_deleted = 0;

-- 3. Strictly isolate Contact activities: Clear deal_id, lead_id, company_id
UPDATE activities
SET 
  deal_id = NULL,
  lead_id = NULL,
  company_id = NULL
WHERE contact_id IS NOT NULL AND is_deleted = 0;

-- 4. Strictly isolate Lead activities: Clear deal_id, contact_id, company_id
UPDATE activities
SET 
  deal_id = NULL,
  contact_id = NULL,
  company_id = NULL
WHERE lead_id IS NOT NULL AND is_deleted = 0;
