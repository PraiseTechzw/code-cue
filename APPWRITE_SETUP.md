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
- `type` (string, required) - Options: "info", "success", "warning", "error", "reminder"
- `read` (boolean, required, default: false)
- `user_id` (string, required)
- `related_id` (string, optional)
- `related_type` (string, optional)
- `action_url` (string, optional)
- `priority` (string, required, default: "medium") - Options: "low", "medium", "high"
- `scheduled_for` (string, optional)
- `sent_at` (string, optional)

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

#### 11. team_members (NEW)
- **Collection ID**: `team_members`
- **Permissions**:
  - Read: Users can read team members for projects they have access to
  - Write: Users can write team members for projects they have access to
  - Create: Users can create team members
  - Delete: Users can delete team members for projects they have access to

**Attributes**:
- `user_id` (string, required)
- `project_id` (string, required)
- `role` (string, required) - Options: "owner", "admin", "member", "viewer"
- `permissions` (string[], required) - Array of permission strings
- `joined_at` (string, required)
- `status` (string, required, default: "active") - Options: "active", "inactive", "pending"
- `avatar_url` (string, optional)
- `full_name` (string, optional)
- `email` (string, optional)

#### 12. project_activities (NEW)
- **Collection ID**: `project_activities`
- **Permissions**:
  - Read: Users can read activities for projects they have access to
  - Write: Users can write activities
  - Create: Users can create activities
  - Delete: Users can delete activities they created

**Attributes**:
- `project_id` (string, required)
- `user_id` (string, required)
- `action` (string, required) - Options: "created", "updated", "deleted", "commented", "assigned", "completed", "started", "paused"
- `entity_type` (string, required) - Options: "project", "phase", "task", "comment", "file"
- `entity_id` (string, required)
- `description` (string, required)
- `metadata` (string, optional) - JSON string for additional data

#### 13. workflow_automations (NEW)
- **Collection ID**: `workflow_automations`
- **Permissions**:
  - Read: Users can read automations for projects they have access to
  - Write: Users can write automations for projects they have access to
  - Create: Users can create automations
  - Delete: Users can delete automations for projects they have access to

**Attributes**:
- `name` (string, required)
- `description` (string, optional)
- `trigger` (string, required) - Options: "task_created", "task_completed", "phase_started", "phase_completed", "project_created", "deadline_approaching", "custom"
- `conditions` (string, optional) - JSON string for automation conditions
- `actions` (string, optional) - JSON string for automation actions
- `is_active` (boolean, required, default: true)
- `project_id` (string, optional) - null for global automations
- `created_by` (string, required)

#### 14. project_templates (NEW)
- **Collection ID**: `project_templates`
- **Permissions**:
  - Read: Users can read public templates
  - Write: Users can write templates they created
  - Create: Users can create templates
  - Delete: Users can delete templates they created

**Attributes**:
- `name` (string, required)
- `description` (string, optional)
- `category` (string, required) - Options: "software", "design", "marketing", "research", "custom"
- `phases` (string, optional) - JSON string for template phases
- `tasks` (string, optional) - JSON string for template tasks
- `estimated_duration` (number, required) - in days
- `complexity` (string, required) - Options: "simple", "medium", "complex"
- `tags` (string[], optional)
- `is_public` (boolean, required, default: true)
- `created_by` (string, required)
- `usage_count` (number, required, default: 0)

#### 15. time_entries (NEW)
- **Collection ID**: `time_entries`
- **Permissions**:
  - Read: Users can read their own time entries
  - Write: Users can write their own time entries
  - Create: Users can create time entries
  - Delete: Users can delete their own time entries

**Attributes**:
- `task_id` (string, required)
- `user_id` (string, required)
- `project_id` (string, required)
- `start_time` (string, required)
- `end_time` (string, optional)
- `duration` (number, required) - in minutes
- `description` (string, optional)
- `is_billable` (boolean, required, default: false)
- `hourly_rate` (number, optional)
- `tags` (string[], optional)

#### 16. project_reports (NEW)
- **Collection ID**: `project_reports`
- **Permissions**:
  - Read: Users can read reports for projects they have access to
  - Write: Users can write reports they created
  - Create: Users can create reports
  - Delete: Users can delete reports they created

**Attributes**:
- `project_id` (string, required)
- `report_type` (string, required) - Options: "progress", "time", "budget", "team", "comprehensive"
- `period` (string, required) - Options: "daily", "weekly", "monthly", "quarterly", "custom"
- `start_date` (string, required)
- `end_date` (string, required)
- `data` (string, optional) - JSON string for report data
- `generated_by` (string, required)
- `is_automated` (boolean, required, default: false)

#### 17. project_budgets (NEW)
- **Collection ID**: `project_budgets`
- **Permissions**:
  - Read: Users can read budgets for projects they have access to
  - Write: Users can write budgets for projects they have access to
  - Create: Users can create budgets
  - Delete: Users can delete budgets for projects they have access to

**Attributes**:
- `project_id` (string, required)
- `total_budget` (number, required)
- `spent_amount` (number, required, default: 0)
- `remaining_amount` (number, required)
- `currency` (string, required, default: "USD")
- `expenses` (string, optional) - JSON string for budget expenses
- `categories` (string, optional) - JSON string for budget categories

#### 18. project_settings (NEW)
- **Collection ID**: `project_settings`
- **Permissions**:
  - Read: Users can read settings for projects they have access to
  - Write: Users can write settings for projects they have access to
  - Create: Users can create settings
  - Delete: Users can delete settings for projects they have access to

**Attributes**:
- `project_id` (string, required)
- `auto_assign_tasks` (boolean, required, default: false)
- `require_time_tracking` (boolean, required, default: false)
- `enable_budget_tracking` (boolean, required, default: false)
- `notification_preferences` (string, optional) - JSON string for notification settings
- `workflow_settings` (string, optional) - JSON string for workflow settings
- `access_control` (string, optional) - JSON string for access control settings

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

#### Creating the notifications Collection (UPDATED)
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
   - `action_url` (string, optional) - **NEW FIELD**
   - `priority` (string, required, default: "medium") - **NEW FIELD**
   - `scheduled_for` (string, optional) - **NEW FIELD**
   - `sent_at` (string, optional) - **NEW FIELD**

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

#### Creating the team_members Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `team_members`
3. Name: `Team Members`
4. Permissions: Set as specified above
5. Add attributes:
   - `user_id` (string, required)
   - `project_id` (string, required)
   - `role` (string, required)
   - `permissions` (string[], required)
   - `joined_at` (string, required)
   - `status` (string, required, default: "active")
   - `avatar_url` (string, optional)
   - `full_name` (string, optional)
   - `email` (string, optional)

#### Creating the project_activities Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `project_activities`
3. Name: `Project Activities`
4. Permissions: Set as specified above
5. Add attributes:
   - `project_id` (string, required)
   - `user_id` (string, required)
   - `action` (string, required)
   - `entity_type` (string, required)
   - `entity_id` (string, required)
   - `description` (string, required)
   - `metadata` (string, optional)

#### Creating the workflow_automations Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `workflow_automations`
3. Name: `Workflow Automations`
4. Permissions: Set as specified above
5. Add attributes:
   - `name` (string, required)
   - `description` (string, optional)
   - `trigger` (string, required)
   - `conditions` (string, optional)
   - `actions` (string, optional)
   - `is_active` (boolean, required, default: true)
   - `project_id` (string, optional)
   - `created_by` (string, required)

#### Creating the project_templates Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `project_templates`
3. Name: `Project Templates`
4. Permissions: Set as specified above
5. Add attributes:
   - `name` (string, required)
   - `description` (string, optional)
   - `category` (string, required)
   - `phases` (string, optional)
   - `tasks` (string, optional)
   - `estimated_duration` (number, required)
   - `complexity` (string, required)
   - `tags` (string[], optional)
   - `is_public` (boolean, required, default: true)
   - `created_by` (string, required)
   - `usage_count` (number, required, default: 0)

#### Creating the time_entries Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `time_entries`
3. Name: `Time Entries`
4. Permissions: Set as specified above
5. Add attributes:
   - `task_id` (string, required)
   - `user_id` (string, required)
   - `project_id` (string, required)
   - `start_time` (string, required)
   - `end_time` (string, optional)
   - `duration` (number, required)
   - `description` (string, optional)
   - `is_billable` (boolean, required, default: false)
   - `hourly_rate` (number, optional)
   - `tags` (string[], optional)

#### Creating the project_reports Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `project_reports`
3. Name: `Project Reports`
4. Permissions: Set as specified above
5. Add attributes:
   - `project_id` (string, required)
   - `report_type` (string, required)
   - `period` (string, required)
   - `start_date` (string, required)
   - `end_date` (string, required)
   - `data` (string, optional)
   - `generated_by` (string, required)
   - `is_automated` (boolean, required, default: false)

#### Creating the project_budgets Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `project_budgets`
3. Name: `Project Budgets`
4. Permissions: Set as specified above
5. Add attributes:
   - `project_id` (string, required)
   - `total_budget` (number, required)
   - `spent_amount` (number, required, default: 0)
   - `remaining_amount` (number, required)
   - `currency` (string, required, default: "USD")
   - `expenses` (string, optional)
   - `categories` (string, optional)

#### Creating the project_settings Collection (NEW)
1. Click **Create Collection**
2. Collection ID: `project_settings`
3. Name: `Project Settings`
4. Permissions: Set as specified above
5. Add attributes:
   - `project_id` (string, required)
   - `auto_assign_tasks` (boolean, required, default: false)
   - `require_time_tracking` (boolean, required, default: false)
   - `enable_budget_tracking` (boolean, required, default: false)
   - `notification_preferences` (string, optional)
   - `workflow_settings` (string, optional)
   - `access_control` (string, optional)

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
6. Test team collaboration features:
   - Add team members
   - Assign roles and permissions
   - Test activity logging
7. Test workflow automation:
   - Create automation rules
   - Test project templates
   - Verify automation triggers
8. Test analytics and reporting:
   - Generate project reports
   - View analytics dashboard
   - Test time tracking

## 9. Advanced Features Available

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

### 👥 Team Collaboration
- **Role-Based Access Control**: Owner, Admin, Member, Viewer roles
- **Permission Management**: Granular permissions for different actions
- **Team Member Management**: Add, remove, and update team members
- **Activity Logging**: Comprehensive project activity tracking
- **Real-time Collaboration**: Team member status and activity

### 🔄 Workflow Automation
- **Automation Rules**: Create custom automation workflows
- **Trigger System**: Multiple trigger types for automation
- **Project Templates**: Pre-built project templates
- **Template Categories**: Software, Design, Marketing, Research, Custom
- **Automation Actions**: Create tasks, send notifications, update status

### 📈 Advanced Analytics
- **Comprehensive Analytics**: Project progress, time tracking, team performance
- **Burndown Charts**: Visual project progress tracking
- **Time Distribution**: Time spent analysis by category
- **Team Performance**: Individual and team efficiency metrics
- **Custom Reports**: Generate detailed project reports
- **Export Functionality**: Export analytics data

### ⏱️ Time Tracking
- **Time Entries**: Track time spent on tasks
- **Billable Hours**: Mark time entries as billable
- **Time Reports**: Generate time-based reports
- **Efficiency Metrics**: Compare estimated vs actual time

### 💰 Budget Management
- **Budget Tracking**: Track project budgets
- **Expense Management**: Record and categorize expenses
- **Budget Reports**: Generate budget reports
- **Currency Support**: Multiple currency support

### 🔧 Project Settings
- **Workflow Settings**: Configure project workflows
- **Notification Preferences**: Customize notification settings
- **Access Control**: Configure project access settings
- **Automation Settings**: Enable/disable automation features

### 🔄 Offline Support
- **Caching**: All data cached locally
- **Offline Operations**: Create/edit when offline
- **Sync**: Automatic sync when back online
- **Conflict Resolution**: Intelligent handling of data conflicts

### 🔗 GitHub Integration
- **Repository Linking**: Connect GitHub repositories to projects
- **Commit Tracking**: Link commits to tasks
- **Code Integration**: Seamless development workflow
- **Branch Management**: Track feature branches and pull requests

### 🎨 Modern UI/UX
- **Responsive Design**: Works on mobile and web
- **Dark/Light Themes**: Customizable appearance
- **Smooth Animations**: Engaging user interactions
- **Haptic Feedback**: Enhanced mobile experience
- **Accessibility**: WCAG compliant design

## 10. Next Steps

After setting up the database, consider implementing:

1. **Push Notifications**: Set up push notification service
2. **Email Integration**: Configure email service for notifications
3. **Webhook Integration**: Set up webhooks for external integrations
4. **Advanced Reporting**: Implement custom report generation
5. **Data Export**: Add data export functionality
6. **Backup System**: Implement automated backups
7. **Performance Monitoring**: Set up monitoring and analytics
8. **Security Audits**: Regular security reviews and updates

This comprehensive setup provides a solid foundation for a modern, feature-rich project management application with advanced collaboration, automation, and analytics capabilities.