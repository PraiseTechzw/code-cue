-- Add foreign key relationship between tasks and profiles
ALTER TABLE tasks
ADD CONSTRAINT tasks_assignee_id_fkey
FOREIGN KEY (assignee_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id); 