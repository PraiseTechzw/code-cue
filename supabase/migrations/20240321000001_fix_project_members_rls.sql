-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION check_project_access(project_id UUID, user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First check if user is the project owner
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Then check if user is a project member
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = $1 AND user_id = $2
  );
END;
$$;

-- Drop existing RLS policies if any
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can add project members" ON project_members;
DROP POLICY IF EXISTS "Users can remove project members" ON project_members;

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies using the security definer function
CREATE POLICY "Users can view project members"
ON project_members FOR SELECT
USING (
  check_project_access(project_id, auth.uid())
);

CREATE POLICY "Users can add project members"
ON project_members FOR INSERT
WITH CHECK (
  check_project_access(project_id, auth.uid())
);

CREATE POLICY "Users can remove project members"
ON project_members FOR DELETE
USING (
  check_project_access(project_id, auth.uid())
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_project_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_project_access TO service_role; 