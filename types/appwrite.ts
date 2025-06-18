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
  user_id: string;
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
  title: string;
  description: string | null;
  type: string;
  read: boolean;
  user_id: string;
  related_id: string | null;
  related_type: string | null;
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