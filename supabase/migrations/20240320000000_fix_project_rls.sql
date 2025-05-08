-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION check_project_access(project_id UUID, user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is the owner
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a project member
  IF EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_id AND user_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Drop existing RLS policies if any
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies using the security definer function
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (
  check_project_access(id, auth.uid())
);

CREATE POLICY "Users can create their own projects"
ON projects FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
);

CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
USING (
  check_project_access(id, auth.uid())
)
WITH CHECK (
  check_project_access(id, auth.uid())
);

CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE
USING (
  check_project_access(id, auth.uid())
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_project_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_project_access TO service_role; 