-- Drop duplicate foreign key constraint
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_task_id_fkey;

-- Add foreign key relationship between comments and profiles
ALTER TABLE comments
ADD CONSTRAINT fk_comments_profile
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add foreign key relationship between comments and tasks
ALTER TABLE comments
ADD CONSTRAINT fk_comments_task
FOREIGN KEY (task_id)
REFERENCES tasks(id)
ON DELETE CASCADE;

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON comments;
DROP POLICY IF EXISTS "Users can create comments on their tasks" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Create RLS policies for comments
CREATE POLICY "Users can view comments on their tasks"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE tasks.id = comments.task_id
    AND (projects.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create comments on their tasks"
ON comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE tasks.id = comments.task_id
    AND (projects.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
USING (user_id = auth.uid()); 