import AsyncStorage from "@react-native-async-storage/async-storage"
import { supabase } from "@/lib/supabase"
import type { Project } from "./projectService"
import type { Task } from "./taskService"
import NetInfo from "@react-native-community/netinfo"

type OfflineChange = {
  table_name: string
  record_id: string
  operation: "INSERT" | "UPDATE" | "DELETE" | "MARK_ALL_READ"
  data: any
  timestamp?: number
}

export const offlineStore = {
  // Check if device is online
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch()
    return state.isConnected === true
  },

  // Check if currently syncing
  async isSyncing(): Promise<boolean> {
    const syncing = await AsyncStorage.getItem("isSyncing")
    return syncing === "true"
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    try {
      const projectsJson = await AsyncStorage.getItem("projects")
      return projectsJson ? JSON.parse(projectsJson) : []
    } catch (error) {
      console.error("Error getting projects from AsyncStorage:", error)
      return []
    }
  },

  async cacheProjects(projects: Project[]): Promise<void> {
    try {
      await AsyncStorage.setItem("projects", JSON.stringify(projects))
    } catch (error) {
      console.error("Error caching projects to AsyncStorage:", error)
    }
  },

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const projects = await this.getProjects()
      return projects.find((p) => p.id === id) || null
    } catch (error) {
      console.error("Error getting project from AsyncStorage:", error)
      return null
    }
  },

  async addProject(project: Project): Promise<void> {
    try {
      const projects = await this.getProjects()
      const updatedProjects = [...projects.filter((p) => p.id !== project.id), project]
      await AsyncStorage.setItem("projects", JSON.stringify(updatedProjects))
    } catch (error) {
      console.error("Error adding project to AsyncStorage:", error)
    }
  },

  async updateProject(project: Project): Promise<void> {
    try {
      const projects = await this.getProjects()
      const updatedProjects = projects.map((p) => (p.id === project.id ? project : p))
      await AsyncStorage.setItem("projects", JSON.stringify(updatedProjects))
    } catch (error) {
      console.error("Error updating project in AsyncStorage:", error)
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      const projects = await this.getProjects()
      const updatedProjects = projects.filter((p) => p.id !== id)
      await AsyncStorage.setItem("projects", JSON.stringify(updatedProjects))

      // Also delete related tasks
      const tasks = await this.getTasks()
      const updatedTasks = tasks.filter((t) => t.project_id !== id)
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks))
    } catch (error) {
      console.error("Error deleting project from AsyncStorage:", error)
    }
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    try {
      const tasksJson = await AsyncStorage.getItem("tasks")
      return tasksJson ? JSON.parse(tasksJson) : []
    } catch (error) {
      console.error("Error getting tasks from AsyncStorage:", error)
      return []
    }
  },

  async cacheTasks(tasks: Task[]): Promise<void> {
    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(tasks))
    } catch (error) {
      console.error("Error caching tasks to AsyncStorage:", error)
    }
  },

  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      const tasks = await this.getTasks()
      return tasks.filter((t) => t.project_id === projectId)
    } catch (error) {
      console.error("Error getting tasks from AsyncStorage:", error)
      return []
    }
  },

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const tasks = await this.getTasks()
      return tasks.find((t) => t.id === id) || null
    } catch (error) {
      console.error("Error getting task from AsyncStorage:", error)
      return null
    }
  },

  async addTask(task: Task): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const updatedTasks = [...tasks.filter((t) => t.id !== task.id), task]
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks))
    } catch (error) {
      console.error("Error adding task to AsyncStorage:", error)
    }
  },

  async updateTask(task: Task): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const updatedTasks = tasks.map((t) => (t.id === task.id ? task : t))
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks))
    } catch (error) {
      console.error("Error updating task in AsyncStorage:", error)
    }
  },

  async deleteTask(id: string): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const updatedTasks = tasks.filter((t) => t.id !== id)
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks))
    } catch (error) {
      console.error("Error deleting task from AsyncStorage:", error)
    }
  },

  // Offline changes tracking
  async addOfflineChange(change: OfflineChange): Promise<void> {
    try {
      const changesJson = await AsyncStorage.getItem("offlineChanges")
      const changes: OfflineChange[] = changesJson ? JSON.parse(changesJson) : []

      // Add timestamp to track order
      const updatedChanges = [...changes, { ...change, timestamp: Date.now() }]
      await AsyncStorage.setItem("offlineChanges", JSON.stringify(updatedChanges))
    } catch (error) {
      console.error("Error adding offline change to AsyncStorage:", error)
    }
  },

  async getOfflineChanges(): Promise<OfflineChange[]> {
    try {
      const changesJson = await AsyncStorage.getItem("offlineChanges")
      return changesJson ? JSON.parse(changesJson) : []
    } catch (error) {
      console.error("Error getting offline changes from AsyncStorage:", error)
      return []
    }
  },

  async clearOfflineChanges(): Promise<void> {
    try {
      await AsyncStorage.setItem("offlineChanges", JSON.stringify([]))
    } catch (error) {
      console.error("Error clearing offline changes from AsyncStorage:", error)
    }
  },

  // Sync offline changes with server
  async syncOfflineChanges(): Promise<void> {
    try {
      // Set syncing flag
      await AsyncStorage.setItem("isSyncing", "true")

      const changes = await this.getOfflineChanges()
      if (changes.length === 0) {
        await AsyncStorage.setItem("isSyncing", "false")
        return
      }

      // Sort changes by timestamp to maintain order
      const sortedChanges = [...changes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        await AsyncStorage.setItem("isSyncing", "false")
        throw new Error("User not authenticated")
      }

      // Process pending theme changes
      const pendingTheme = await AsyncStorage.getItem("pendingThemeChange")
      if (pendingTheme) {
        try {
          await supabase.from("profiles").update({ theme: pendingTheme }).eq("id", user.id)
          await AsyncStorage.removeItem("pendingThemeChange")
        } catch (error) {
          console.error("Error syncing theme change:", error)
        }
      }

      for (const change of sortedChanges) {
        try {
          switch (change.operation) {
            case "INSERT":
              if (change.table_name === "projects") {
                await supabase.from("projects").insert(change.data)
              } else if (change.table_name === "tasks") {
                await supabase.from("tasks").insert(change.data)
              } else if (change.table_name === "notifications") {
                await supabase.from("notifications").insert(change.data)
              }
              break
            case "UPDATE":
              if (change.table_name === "projects") {
                await supabase.from("projects").update(change.data).eq("id", change.record_id)
              } else if (change.table_name === "tasks") {
                await supabase.from("tasks").update(change.data).eq("id", change.record_id)
              } else if (change.table_name === "profiles") {
                await supabase.from("profiles").update(change.data).eq("id", change.record_id)
              } else if (change.table_name === "notifications") {
                await supabase.from("notifications").update(change.data).eq("id", change.record_id)
              }
              break
            case "DELETE":
              if (change.table_name === "projects") {
                await supabase.from("projects").delete().eq("id", change.record_id)
              } else if (change.table_name === "tasks") {
                await supabase.from("tasks").delete().eq("id", change.record_id)
              }
              break
            case "MARK_ALL_READ":
              if (change.table_name === "notifications") {
                await supabase
                  .from("notifications")
                  .update({ read: true })
                  .eq("user_id", change.data.user_id)
                  .eq("read", false)
              }
              break
          }
        } catch (error) {
          console.error(`Error syncing change for ${change.table_name}:`, error)
          // Continue with other changes even if one fails
        }
      }

      // After syncing, clear the offline changes
      await this.clearOfflineChanges()

      // Refresh local data from server
      await this.refreshLocalData()

      // Update last synced time
      await AsyncStorage.setItem("lastSyncedTime", Date.now().toString())

      // Clear syncing flag
      await AsyncStorage.setItem("isSyncing", "false")
    } catch (error) {
      console.error("Error syncing offline changes:", error)
      await AsyncStorage.setItem("isSyncing", "false")
    }
  },

  // Refresh local data from server
  async refreshLocalData(): Promise<void> {
    try {
      // Refresh projects
      const { data: projects } = await supabase.from("projects").select("*")
      if (projects) {
        await AsyncStorage.setItem("projects", JSON.stringify(projects))
      }

      // Refresh tasks
      const { data: tasks } = await supabase.from("tasks").select("*")
      if (tasks) {
        await AsyncStorage.setItem("tasks", JSON.stringify(tasks))
      }

      // Refresh notifications
      const { data: notifications } = await supabase.from("notifications").select("*")
      if (notifications) {
        await AsyncStorage.setItem("notifications", JSON.stringify(notifications))
      }

      // Refresh profile
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (profile) {
          await AsyncStorage.setItem("profile", JSON.stringify(profile))
        }
      }
    } catch (error) {
      console.error("Error refreshing local data:", error)
    }
  },
}
