-- Migration to add required fields for activities (Tasks and Meetings)
ALTER TABLE activities 
ADD COLUMN title VARCHAR(255) AFTER type,
ADD COLUMN assigned_to INT(10) UNSIGNED AFTER created_by,
ADD COLUMN deadline DATE AFTER follow_up_at,
ADD COLUMN meeting_date DATE AFTER deadline,
ADD COLUMN meeting_time TIME AFTER meeting_date,
ADD COLUMN participants TEXT AFTER meeting_time;

-- Optional: Add foreign key for assigned_to
-- ALTER TABLE activities ADD CONSTRAINT fk_activities_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id);
