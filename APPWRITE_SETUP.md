# Appwrite Setup Guide

This project has been migrated from Supabase to Appwrite. Follow these steps to set up your Appwrite backend with the enhanced project management system including phases, team collaboration, and advanced features.

## 1. Create Appwrite Project

1. Go to [Appwrite Console](https://cloud.appwrite.io/)
2. Create a new project
3. Note down your Project ID

## 2. Set up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Appwrite Configuration
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id

# AI Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key

# App Configuration
EXPO_PROJECT_ID=your-expo-project-id
```

## 3. Create Database and Collections

### Database
- Create a database named `code-cue-db`
- Note down the Database ID

### Collections Setup

#### 1. profiles
- **Collection ID**: `profiles`
- **Permissions**: 
  - Read: Users can read their own profile
  - Write: Users can write their own profile
  - Create: Users can create their own profile

**Attributes**:
- `user_id` (string, required)
- `full_name` (string, optional)
- `avatar_url` (string, optional)
- `theme` (string, optional)
- `push_token` (string, optional)
- `role` (string, required, default: "user")

#### 2. projects
- **Collection ID**: `projects`
- **Permissions**:
  - Read: Users can read projects they own
  - Write: Users can write projects they own
  - Create: Users can create projects
  - Delete: Users can delete projects they own

**Attributes**:
- `name` (string, required)
- `description` (string, optional)
- `progress` (integer, required, default: 0)
- `owner_id` (string, required)
- `start_date` (string, optional)
- `end_date` (string, optional)
- `status` (string, required, default: "planning") - Options: "planning", "active", "on-hold", "completed", "cancelled"
- `priority` (string, required, default: "medium") - Options: "low", "medium", "high", "critical"
- `budget` (number, optional)
- `team_size` (number, optional)

#### 3. phases
- **Collection ID**: `phases`
- **Permissions**:
  - Read: Users can read phases for projects they own
  - Write: Users can write phases for projects they own
  - Create: Users can create phases
  - Delete: Users can delete phases for projects they own

**Attributes**:
- `name` (string, required)
- `description` (string, optional)
- `project_id` (string, required)
- `order` (integer, required, default: 1)
- `progress` (integer, required, default: 0)
- `start_date` (string, optional)
- `end_date` (string, optional)
- `status` (string, required, default: "not-started") - Options: "not-started", "in-progress", "completed", "on-hold"
- `weight` (number, required, default: 0) - Percentage weight for project progress calculation
- `assignee_id` (string, optional)
- `dependencies` (string[], optional) - Array of phase IDs this phase depends on

#### 4. tasks
- **Collection ID**: `tasks`
- **Permissions**:
  - Read: Users can read tasks they own
  - Write: Users can write tasks they own
  - Create: Users can create tasks
  - Delete: Users can delete tasks they own

**Attributes**:
- `title` (string, required)
- `description` (string, optional)
- `status` (string, required, default: "todo") - Options: "todo", "inProgress", "done"
- `priority` (string, required, default: "medium") - Options: "low", "medium", "high"
- `due_date` (string, optional)
- `project_id` (string, required)
- `phase_id` (string, optional) - New field to link tasks to phases
- `user_id` (string, required)
- `assignee_id` (string, optional) - New field for task assignment
- `estimated_hours` (number, optional) - New field for time estimation
- `actual_hours` (number, optional) - New field for actual time tracking
- `dependencies` (string[], optional) - New field for task dependencies
- `tags` (string[], optional) - New field for task categorization

#### 5. subtasks
- **Collection ID**: `subtasks`
- **Permissions**:
  - Read: Users can read subtasks for tasks they have access to
  - Write: Users can write subtasks for tasks they have access to
  - Create: Users can create subtasks
  - Delete: Users can delete subtasks they created

**Attributes**:
- `title` (string, required)
- `completed` (boolean, required, default: false)
- `task_id` (string, required)

#### 6. comments
- **Collection ID**: `comments`
- **Permissions**:
  - Read: Users can read comments for tasks they have access to
  - Write: Users can write comments they created
  - Create: Users can create comments
  - Delete: Users can delete comments they created

**Attributes**:
- `text` (string, required)
- `task_id` (string, required)
- `user_id` (string, required)

#### 7. notifications
- **Collection ID**: `notifications`
- **Permissions**:
  - Read: Users can read their own notifications
  - Write: Users can write their own notifications
  - Create: Users can create notifications
  - Delete: Users can delete their own notifications

**Attributes**:
- `title` (string, required)
- `description` (string, optional)
- `type` (string, required)
- `read` (boolean, required, default: false)
- `user_id` (string, required)
- `related_id` (string, optional)
- `related_type` (string, optional)

#### 8. github_repositories
- **Collection ID**: `github_repositories`
- **Permissions**:
  - Read: Users can read their own repositories
  - Write: Users can write their own repositories
  - Create: Users can create repositories
  - Delete: Users can delete their own repositories

**Attributes**:
- `repo_id` (string, required)
- `name` (string, required)
- `full_name` (string, required)
- `description` (string, optional)
- `html_url` (string, required)
- `user_id` (string, required)
- `project_id` (string, optional)

#### 9. github_commits
- **Collection ID**: `github_commits`
- **Permissions**:
  - Read: Users can read commits for repositories they have access to
  - Write: Users can write commits they created
  - Create: Users can create commits
  - Delete: Users can delete commits they created

**Attributes**:
- `commit_id` (string, required)
- `message` (string, required)
- `author` (string, required)
- `html_url` (string, required)
- `repository_id` (string, required)
- `task_id` (string, optional)
- `committed_at` (string, required)

#### 10. github_connections
- **Collection ID**: `github_connections`
- **Permissions**:
  - Read: Users can read their own connections
  - Write: Users can write their own connections
  - Create: Users can create connections
  - Delete: Users can delete their own connections

**Attributes**:
- `user_id` (string, required)
- `username` (string, required)
- `access_token` (string, required)

## 4. Step-by-Step Collection Creation

### Step 1: Create the Database
1. Go to your Appwrite Console
2. Navigate to **Databases**
3. Click **Create Database**
4. Name: `code-cue-db`
5. Click **Create**

### Step 2: Create Collections

#### Creating the profiles Collection
1. Click **Create Collection**
2. Collection ID: `profiles`
3. Name: `Profiles`
4. Permissions: Set as specified above
5. Add attributes one by one:
   - `user_id` (string, required)
   - `full_name` (string, optional)
   - `avatar_url` (string, optional)
   - `theme` (string, optional)
   - `push_token` (string, optional)
   - `role` (string, required, default: "user")

#### Creating the projects Collection
1. Click **Create Collection**
2. Collection ID: `projects`
3. Name: `Projects`
4. Permissions: Set as specified above
5. Add attributes:
   - `name` (string, required)
   - `description` (string, optional)
   - `progress` (integer, required, default: 0)
   - `owner_id` (string, required)
   - `start_date` (string, optional)
   - `end_date` (string, optional)
   - `status` (string, required, default: "planning")
   - `priority` (string, required, default: "medium")
   - `budget` (number, optional)
   - `team_size` (number, optional)

#### Creating the phases Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `phases`
3. Name: `Phases`
4. Permissions: Set as specified above
5. Add attributes:
   - `name` (string, required)
   - `description` (string, optional)
   - `project_id` (string, required)
   - `order` (integer, required, default: 1)
   - `progress` (integer, required, default: 0)
   - `start_date` (string, optional)
   - `end_date` (string, optional)
   - `status` (string, required, default: "not-started")
   - `weight` (number, required, default: 0)
   - `assignee_id` (string, optional)
   - `dependencies` (string[], optional)

#### Creating the tasks Collection (UPDATED)
1. Click **Create Collection**
2. Collection ID: `tasks`
3. Name: `Tasks`
4. Permissions: Set as specified above
5. Add attributes:
   - `title` (string, required)
   - `description` (string, optional)
   - `status` (string, required, default: "todo")
   - `priority` (string, required, default: "medium")
   - `due_date` (string, optional)
   - `project_id` (string, required)
   - `phase_id` (string, optional) - **NEW FIELD**
   - `user_id` (string, required)
   - `assignee_id` (string, optional) - **NEW FIELD**
   - `estimated_hours` (number, optional) - **NEW FIELD**
   - `actual_hours` (number, optional) - **NEW FIELD**
   - `dependencies` (string[], optional) - **NEW FIELD**
   - `tags` (string[], optional) - **NEW FIELD**

#### Creating the subtasks Collection
1. Click **Create Collection**
2. Collection ID: `subtasks`
3. Name: `Subtasks`
4. Permissions: Set as specified above
5. Add attributes:
   - `title` (string, required)
   - `completed` (boolean, required, default: false)
   - `task_id` (string, required)

#### Creating the comments Collection
1. Click **Create Collection**
2. Collection ID: `comments`
3. Name: `Comments`
4. Permissions: Set as specified above
5. Add attributes:
   - `text` (string, required)
   - `task_id` (string, required)
   - `user_id` (string, required)

#### Creating the notifications Collection
1. Click **Create Collection**
2. Collection ID: `notifications`
3. Name: `Notifications`
4. Permissions: Set as specified above
5. Add attributes:
   - `title` (string, required)
   - `description` (string, optional)
   - `type` (string, required)
   - `read` (boolean, required, default: false)
   - `user_id` (string, required)
   - `related_id` (string, optional)
   - `related_type` (string, optional)

#### Creating the github_repositories Collection
1. Click **Create Collection**
2. Collection ID: `github_repositories`
3. Name: `GitHub Repositories`
4. Permissions: Set as specified above
5. Add attributes:
   - `repo_id` (string, required)
   - `name` (string, required)
   - `full_name` (string, required)
   - `description` (string, optional)
   - `html_url` (string, required)
   - `user_id` (string, required)
   - `project_id` (string, optional)

#### Creating the github_commits Collection
1. Click **Create Collection**
2. Collection ID: `github_commits`
3. Name: `GitHub Commits`
4. Permissions: Set as specified above
5. Add attributes:
   - `commit_id` (string, required)
   - `message` (string, required)
   - `author` (string, required)
   - `html_url` (string, required)
   - `repository_id` (string, required)
   - `task_id` (string, optional)
   - `committed_at` (string, required)

#### Creating the github_connections Collection
1. Click **Create Collection**
2. Collection ID: `github_connections`
3. Name: `GitHub Connections`
4. Permissions: Set as specified above
5. Add attributes:
   - `user_id` (string, required)
   - `username` (string, required)
   - `access_token` (string, required)

## 5. Set up Storage

Create a storage bucket named `profile-images` with the following permissions:
- Read: Users can read all files
- Write: Users can write files
- Create: Users can create files
- Delete: Users can delete files they uploaded

## 6. Configure Authentication

1. Enable Email/Password authentication in your Appwrite project
2. Configure your app's authentication settings
3. Set up any additional authentication providers if needed

## 7. Update App Configuration

Make sure your app's configuration files are updated to use the new Appwrite endpoints and project ID.

## 8. Test the Setup

1. Run the app
2. Try to create a new account
3. Test basic CRUD operations
4. Verify that offline functionality works
5. Test the new phase system:
   - Create a project
   - Add phases to the project
   - Create tasks within phases
   - Test progress calculation

## 9. New Features Available

With this setup, you now have access to:

### 🎯 Enhanced Project Management
- **3-Level Hierarchy**: Project → Phase → Task
- **Weighted Progress**: Phases contribute to overall project progress
- **Status Tracking**: Multiple status options for projects and phases
- **Priority Management**: Priority levels for projects and tasks

### 📊 Advanced Task Management
- **Phase Assignment**: Tasks can be assigned to specific phases
- **Time Tracking**: Estimated and actual hours
- **Dependencies**: Task and phase dependencies
- **Tags**: Task categorization
- **Assignee Management**: Task assignment to team members

### 🔄 Offline Support
- **Caching**: All data cached locally
- **Offline Operations**: Create/edit when offline
- **Sync**: Automatic sync when back online

### 🔗 GitHub Integration
- **Repository Linking**: Connect GitHub repositories to projects
- **Commit Tracking**: Link commits to tasks
- **Code Integration**: Seamless development workflow

## Troubleshooting

- Make sure all environment variables are correctly set
- Verify that your Appwrite project ID is correct
- Check that all collections have the correct permissions
- Ensure your app has the necessary permissions to access Appwrite services
- If you encounter issues with the phase system, verify that the `phases` collection is properly created with all required attributes

## Migration Notes

This migration replaces all Supabase functionality with Appwrite equivalents:
- Authentication: Supabase Auth → Appwrite Auth
- Database: Supabase PostgreSQL → Appwrite Database
- Storage: Supabase Storage → Appwrite Storage
- Real-time: Supabase Realtime → Appwrite Realtime (if needed)

The new phase system provides a much more structured approach to project management, making your app suitable for professional project management needs.