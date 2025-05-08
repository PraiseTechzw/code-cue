-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_members_user_id_fkey'
    ) THEN
        ALTER TABLE project_members DROP CONSTRAINT project_members_user_id_fkey;
    END IF;
END $$;

-- Add foreign key relationship between project_members and profiles
ALTER TABLE project_members
ADD CONSTRAINT project_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id); 