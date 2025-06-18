# Appwrite Setup Guide

This project has been migrated from Supabase to Appwrite. Follow these steps to set up your Appwrite backend:

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

### Collections
Create the following collections in your database:

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

#### 3. tasks
- **Collection ID**: `tasks`
- **Permissions**:
  - Read: Users can read tasks they created or are assigned to
  - Write: Users can write tasks they created or are assigned to
  - Create: Users can create tasks
  - Delete: Users can delete tasks they created

**Attributes**:
- `title` (string, required)
- `description` (string, optional)
- `status` (string, required, default: "todo")
- `priority` (string, required, default: "medium")
- `due_date` (string, optional)
- `project_id` (string, required)
- `user_id` (string, required)

#### 4. subtasks
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

#### 5. comments
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

#### 6. notifications
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

#### 7. github_repositories
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

#### 8. github_commits
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

#### 9. github_connections
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

## 4. Set up Storage

Create a storage bucket named `profile-images` with the following permissions:
- Read: Users can read all files
- Write: Users can write files
- Create: Users can create files
- Delete: Users can delete files they uploaded

## 5. Configure Authentication

1. Enable Email/Password authentication in your Appwrite project
2. Configure your app's authentication settings
3. Set up any additional authentication providers if needed

## 6. Update App Configuration

Make sure your app's configuration files are updated to use the new Appwrite endpoints and project ID.

## 7. Test the Setup

1. Run the app
2. Try to create a new account
3. Test basic CRUD operations
4. Verify that offline functionality works

## Troubleshooting

- Make sure all environment variables are correctly set
- Verify that your Appwrite project ID is correct
- Check that all collections have the correct permissions
- Ensure your app has the necessary permissions to access Appwrite services

## Migration Notes

This migration replaces all Supabase functionality with Appwrite equivalents:
- Authentication: Supabase Auth → Appwrite Auth
- Database: Supabase PostgreSQL → Appwrite Database
- Storage: Supabase Storage → Appwrite Storage
- Real-time: Supabase Realtime → Appwrite Realtime (if needed)