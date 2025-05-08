export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
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
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          progress?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          progress?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          owner_id?: string
        }
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
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
          created_at: string
          updated_at: string
          project_id: string
          assignee_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
          project_id: string
          assignee_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
          project_id?: string
          assignee_id?: string | null
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
          type: string
          title: string
          description: string | null
          read: boolean
          user_id: string
          related_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          description?: string | null
          read?: boolean
          user_id: string
          related_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          description?: string | null
          read?: boolean
          user_id?: string
          related_id?: string | null
          created_at?: string
        }
      }
      github_connections: {
        Row: {
          id: string
          user_id: string
          access_token: string
          username: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          username?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          username?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      offline_changes: {
        Row: {
          id: string
          user_id: string
          table_name: string
          record_id: string
          operation: string
          data: Json
          synced: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          record_id: string
          operation: string
          data: Json
          synced?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          table_name?: string
          record_id?: string
          operation?: string
          data?: Json
          synced?: boolean
          created_at?: string
        }
      }
    }
  }
}
