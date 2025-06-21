// Appwrite Types for Code-Cue

export interface Profile {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  full_name: string | null;
  avatar_url: string | null;
  theme: string | null;
  push_token: string | null;
  role: string;
  user_id: string;
}

export interface Project {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description: string | null;
  progress: number;
  owner_id: string;
  start_date: string | null;
  end_date: string | null;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget: number | null;
  team_size: number | null;
}

export interface Phase {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description: string | null;
  project_id: string;
  order: number;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  weight: number; // Percentage weight for overall project progress
  assignee_id: string | null;
  dependencies: string[]; // Array of phase IDs this phase depends on
}

export interface Task {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  phase_id: string | null; // New field to link tasks to phases
  user_id: string;
  assignee_id: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  dependencies: string[]; // Array of task IDs this task depends on
  tags: string[];
}

export interface Subtask {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  completed: boolean;
  task_id: string;
}

export interface Comment {
  $id: string;
  $createdAt: string;
  text: string;
  task_id: string;
  user_id: string;
}

export interface Notification {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  description: string | null;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder';
  user_id: string;
  related_id?: string;
  related_type?: string;
  read: boolean;
  action_url?: string;
  priority: 'low' | 'medium' | 'high';
  scheduled_for?: string;
  sent_at?: string;
}

export interface GithubRepository {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  repo_id: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  user_id: string;
  project_id: string | null;
}

export interface GithubCommit {
  $id: string;
  $createdAt: string;
  commit_id: string;
  message: string;
  author: string;
  html_url: string;
  repository_id: string;
  task_id: string | null;
  committed_at: string;
}

export interface GithubConnection {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  user_id: string;
  username: string;
  access_token: string;
}

// Appwrite User type
export interface AppwriteUser {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  registration: string;
  status: boolean;
  labels: string[];
  passwordUpdate: string;
  email: string;
  phone: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  prefs: Record<string, any>;
}

// Appwrite Session type
export interface AppwriteSession {
  $id: string;
  $createdAt: string;
  userId: string;
  expire: string;
  provider: string;
  providerUid: string;
  providerAccessToken: string;
  providerAccessTokenExpiry: string;
  providerRefreshToken: string;
  ip: string;
  osCode: string;
  osName: string;
  osVersion: string;
  clientType: string;
  clientCode: string;
  clientName: string;
  clientVersion: string;
  clientEngine: string;
  clientEngineVersion: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  countryCode: string;
  countryName: string;
  current: boolean;
}

// New interfaces for advanced features

export interface TeamMember {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  user_id: string;
  project_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joined_at: string;
  status: 'active' | 'inactive' | 'pending';
  avatar_url?: string;
  full_name?: string;
  email?: string;
}

export interface ProjectTemplate {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description: string | null;
  category: 'software' | 'design' | 'marketing' | 'research' | 'custom';
  phases: TemplatePhase[];
  tasks: TemplateTask[];
  estimated_duration: number; // in days
  complexity: 'simple' | 'medium' | 'complex';
  tags: string[];
  is_public: boolean;
  created_by: string;
  usage_count: number;
}

export interface TemplatePhase {
  name: string;
  description: string | null;
  order: number;
  weight: number;
  estimated_duration: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number;
  tags: string[];
  dependencies: string[];
}

export interface WorkflowAutomation {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description: string | null;
  trigger: 'task_created' | 'task_completed' | 'phase_started' | 'phase_completed' | 'project_created' | 'deadline_approaching' | 'custom';
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  project_id?: string; // null for global automations
  created_by: string;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface AutomationAction {
  type: 'create_task' | 'update_task' | 'send_notification' | 'assign_user' | 'update_status' | 'send_email' | 'webhook';
  parameters: Record<string, any>;
}

export interface TimeEntry {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  task_id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time?: string;
  duration: number; // in minutes
  description: string | null;
  is_billable: boolean;
  hourly_rate?: number;
  tags: string[];
}

export interface ProjectReport {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  project_id: string;
  report_type: 'progress' | 'time' | 'budget' | 'team' | 'comprehensive';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  start_date: string;
  end_date: string;
  data: Record<string, any>;
  generated_by: string;
  is_automated: boolean;
}

export interface ProjectActivity {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  project_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'assigned' | 'completed' | 'started' | 'paused';
  entity_type: 'project' | 'phase' | 'task' | 'comment' | 'file';
  entity_id: string;
  description: string;
  metadata: Record<string, any>;
}

export interface ProjectAnalytics {
  project_id: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  total_time_spent: number; // in minutes
  estimated_time: number; // in minutes
  team_members: number;
  phases_completed: number;
  total_phases: number;
  progress_percentage: number;
  velocity: number; // tasks completed per day
  burndown_data: BurndownPoint[];
  time_distribution: TimeDistribution[];
  team_performance: TeamPerformance[];
}

export interface BurndownPoint {
  date: string;
  remaining_tasks: number;
  completed_tasks: number;
  ideal_remaining: number;
}

export interface TimeDistribution {
  category: string;
  hours: number;
  percentage: number;
}

export interface TeamPerformance {
  user_id: string;
  user_name: string;
  tasks_completed: number;
  time_spent: number;
  efficiency_score: number;
  on_time_completion_rate: number;
}

export interface ProjectBudget {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  project_id: string;
  total_budget: number;
  spent_amount: number;
  remaining_amount: number;
  currency: string;
  expenses: BudgetExpense[];
  categories: BudgetCategory[];
}

export interface BudgetExpense {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  project_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  approved_by?: string;
  receipt_url?: string;
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface ProjectSettings {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  project_id: string;
  auto_assign_tasks: boolean;
  require_time_tracking: boolean;
  enable_budget_tracking: boolean;
  notification_preferences: NotificationPreferences;
  workflow_settings: WorkflowSettings;
  access_control: AccessControlSettings;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  task_updates: boolean;
  deadline_reminders: boolean;
  team_activity: boolean;
  weekly_reports: boolean;
}

export interface WorkflowSettings {
  auto_progress_phases: boolean;
  require_approval_for_completion: boolean;
  enable_dependencies: boolean;
  allow_parallel_tasks: boolean;
}

export interface AccessControlSettings {
  public_read: boolean;
  allow_guest_comments: boolean;
  require_approval_for_join: boolean;
  restricted_phases: string[];
} 