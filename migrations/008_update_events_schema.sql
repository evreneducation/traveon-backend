-- Update events table to use text for dates and remove end date
ALTER TABLE events 
DROP COLUMN IF EXISTS end_date;

ALTER TABLE events 
ALTER COLUMN start_date TYPE text;

-- Update the column name to be more descriptive
ALTER TABLE events 
RENAME COLUMN start_date TO event_date; 