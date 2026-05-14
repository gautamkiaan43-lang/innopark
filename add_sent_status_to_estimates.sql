-- Add 'Sent' status to estimates table enum
ALTER TABLE `estimates` 
MODIFY COLUMN `status` ENUM('Waiting', 'Accepted', 'Declined', 'Expired', 'Draft', 'Sent') DEFAULT 'Waiting';

