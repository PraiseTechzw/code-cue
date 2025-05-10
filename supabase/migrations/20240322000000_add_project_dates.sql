-- Add start_date and end_date columns to projects table
ALTER TABLE projects
ADD COLUMN start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;

-- Update the type definitions
ALTER TYPE projects_row_type ADD ATTRIBUTE start_date TIMESTAMP WITH TIME ZONE;
ALTER TYPE projects_row_type ADD ATTRIBUTE end_date TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS projects_start_date_idx ON projects(start_date);
CREATE INDEX IF NOT EXISTS projects_end_date_idx ON projects(end_date); 