-- Create function for cascade project deletion
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete tasks
    DELETE FROM tasks WHERE tasks.project_id = p_project_id;
    
    -- Delete project members
    DELETE FROM project_members WHERE project_members.project_id = p_project_id;
    
    -- Delete the project
    DELETE FROM projects WHERE projects.id = p_project_id;
END;
$$;

-- Create trigger to use the cascade deletion function
DROP TRIGGER IF EXISTS trigger_delete_project_cascade ON projects;
CREATE TRIGGER trigger_delete_project_cascade
    BEFORE DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION delete_project_cascade(OLD.id); 