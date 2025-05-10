export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          theme: string | null
          push_token: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string | null
          push_token?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string | null
          push_token?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          progress: number
          owner_id: string
          created_at: string
          updated_at: string
          start_date: string | null
          end_date: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          progress?: number
          owner_id: string
          created_at?: string
          updated_at?: string
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          progress?: number
          owner_id?: string
          created_at?: string
          updated_at?: string
          start_date?: string | null
          end_date?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          priority: string
          due_date: string | null
          project_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          project_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          project_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          title: string
          completed: boolean
          task_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          completed?: boolean
          task_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          completed?: boolean
          task_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          text: string
          task_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          task_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          task_id?: string
          user_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          description: string | null
          type: string
          read: boolean
          user_id: string
          related_id: string | null
          related_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: string
          read?: boolean
          user_id: string
          related_id?: string | null
          related_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: string
          read?: boolean
          user_id?: string
          related_id?: string | null
          related_type?: string | null
          created_at?: string
        }
      }
      github_repositories: {
        Row: {
          id: string
          repo_id: string
          name: string
          full_name: string
          description: string | null
          html_url: string
          user_id: string
          project_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          name: string
          full_name: string
          description?: string | null
          html_url: string
          user_id: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          name?: string
          full_name?: string
          description?: string | null
          html_url?: string
          user_id?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_commits: {
        Row: {
          id: string
          commit_id: string
          message: string
          author: string
          html_url: string
          repository_id: string
          task_id: string | null
          committed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          commit_id: string
          message: string
          author: string
          html_url: string
          repository_id: string
          task_id?: string | null
          committed_at: string
          created_at?: string
        }
        Update: {
          id?: string
          commit_id?: string
          message?: string
          author?: string
          html_url?: string
          repository_id?: string
          task_id?: string | null
          committed_at?: string
          created_at?: string
        }
      }
      github_connections: {
        Row: {
          id: string
          user_id: string
          username: string
          access_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          access_token: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          access_token?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
