-- Create function for cascade project deletion
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete tasks
    DELETE FROM tasks WHERE project_id = p_project_id;
    
    -- Delete project members
    DELETE FROM project_members WHERE project_id = p_project_id;
    
    -- Delete the project
    DELETE FROM projects WHERE id = p_project_id;
END;
$$; 