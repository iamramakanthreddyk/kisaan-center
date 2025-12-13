-- Add firstname column to kisaan_users table
-- This column was missing from the database but is expected by the application code

ALTER TABLE kisaan_users ADD COLUMN IF NOT EXISTS firstname VARCHAR(255);

-- Add a comment to document the column
COMMENT ON COLUMN kisaan_users.firstname IS 'First name of the user, used for display purposes and username generation';