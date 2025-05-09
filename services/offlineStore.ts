import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import { supabase } from "@/lib/supabase"
import type { Project } from "./projectService"
import type { Task } from "./taskService"

// Define types for offline changes
interface OfflineChange {
  id?: string
  table_name: string
  record_id: string
  operation: "INSERT" | "UPDATE" | "DELETE"
  data: any
  timestamp: number
}

// Cache for in-memory data
const cache: Record<string, any> = {}

// Function to generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const offlineStore = {
  // Load cached data from AsyncStorage
  async loadCachedData() {
    try {
      // Load projects
      const projectsData = await AsyncStorage.getItem("cachedProjects")
      if (projectsData) {
        cache.projects = JSON.parse(projectsData)
      }

      // Load tasks
      const tasksData = await AsyncStorage.getItem("cachedTasks")
      if (tasksData) {
        cache.tasks = JSON.parse(tasksData)
      }

      // Load user profile
      const profileData = await AsyncStorage.getItem("cachedProfile")
      if (profileData) {
        cache.profile = JSON.parse(profileData)
      }

      // Load notifications
      const notificationsData = await AsyncStorage.getItem("cachedNotifications")
      if (notificationsData) {
        cache.notifications = JSON.parse(notificationsData)
      }

      // Load GitHub data
      const githubData = await AsyncStorage.getItem("cachedGithub")
      if (githubData) {
        cache.github = JSON.parse(githubData)
      }

      console.log("Cached data loaded successfully")
    } catch (error) {
      console.error("Error loading cached data:", error)
    }
  },

  // Persist cached data to AsyncStorage
  async persistCachedData() {
    try {
      // Save projects
      if (cache.projects) {
        await AsyncStorage.setItem("cachedProjects", JSON.stringify(cache.projects))
      }

      // Save tasks
      if (cache.tasks) {
        await AsyncStorage.setItem("cachedTasks", JSON.stringify(cache.tasks))
      }

      // Save user profile
      if (cache.profile) {
        await AsyncStorage.setItem("cachedProfile", JSON.stringify(cache.profile))
      }

      // Save notifications
      if (cache.notifications) {
        await AsyncStorage.setItem("cachedNotifications", JSON.stringify(cache.notifications))
      }

      // Save GitHub data
      if (cache.github) {
        await AsyncStorage.setItem("cachedGithub", JSON.stringify(cache.github))
      }

      console.log("Cached data persisted successfully")
    } catch (error) {
      console.error("Error persisting cached data:", error)
    }
  },

  // Get data from cache or fetch from API
  async getData(key: string, fetchFunction: () => Promise<any>) {
    try {
      // Check if we're online
      const netInfo = await NetInfo.fetch()

      if (netInfo.isConnected) {
        // We're online, fetch fresh data
        const data = await fetchFunction()

        // Update cache
        cache[key] = data

        // Persist to AsyncStorage
        await AsyncStorage.setItem(`cached${key.charAt(0).toUpperCase() + key.slice(1)}`, JSON.stringify(data))

        return data
      } else {
        // We're offline, use cached data
        if (cache[key]) {
          return cache[key]
        }

        // Try to get from AsyncStorage if not in memory
        const cachedData = await AsyncStorage.getItem(`cached${key.charAt(0).toUpperCase() + key.slice(1)}`)
        if (cachedData) {
          const data = JSON.parse(cachedData)
          cache[key] = data
          return data
        }

        // No cached data available
        return null
      }
    } catch (error) {
      console.error(`Error getting data for ${key}:`, error)

      // Try to use cached data as fallback
      if (cache[key]) {
        return cache[key]
      }

      // Try to get from AsyncStorage if not in memory
      try {
        const cachedData = await AsyncStorage.getItem(`cached${key.charAt(0).toUpperCase() + key.slice(1)}`)
        if (cachedData) {
          const data = JSON.parse(cachedData)
          cache[key] = data
          return data
        }
      } catch (e) {
        console.error(`Error getting cached data for ${key}:`, e)
      }

      // No cached data available
      return null
    }
  },
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
  async addOfflineChange(change: Omit<OfflineChange, "id" | "timestamp">) {
    try {
      // Get existing offline changes
      const offlineChangesData = await AsyncStorage.getItem("offlineChanges")
      const offlineChanges: OfflineChange[] = offlineChangesData ? JSON.parse(offlineChangesData) : []

      // Add new change with ID and timestamp
      const newChange: OfflineChange = {
        ...change,
        id: generateId(),
        timestamp: Date.now(),
      }

      offlineChanges.push(newChange)

      // Save updated changes
      await AsyncStorage.setItem("offlineChanges", JSON.stringify(offlineChanges))

      console.log("Offline change added:", newChange)

      // Update in-memory cache if applicable
      if (change.operation === "INSERT" || change.operation === "UPDATE") {
        const tableName = change.table_name.toLowerCase()
        if (!cache[tableName]) {
          cache[tableName] = []
        }

        // Find existing record or add new one
        const existingIndex = cache[tableName].findIndex((item: any) => item.id === change.record_id)
        if (existingIndex >= 0) {
          cache[tableName][existingIndex] = { ...cache[tableName][existingIndex], ...change.data }
        } else {
          cache[tableName].push({ id: change.record_id, ...change.data })
        }
      } else if (change.operation === "DELETE") {
        const tableName = change.table_name.toLowerCase()
        if (cache[tableName]) {
          cache[tableName] = cache[tableName].filter((item: any) => item.id !== change.record_id)
        }
      }

      return true
    } catch (error) {
      console.error("Error adding offline change:", error)
      return false
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

  // Sync offline changes with the server
  async syncOfflineChanges() {
    try {
      // Check if we're online
      const netInfo = await NetInfo.fetch()
      if (!netInfo.isConnected) {
        console.log("Cannot sync offline changes: device is offline")
        return false
      }

      // Get offline changes
      const offlineChangesData = await AsyncStorage.getItem("offlineChanges")
      if (!offlineChangesData) {
        console.log("No offline changes to sync")
        return true
      }

      const offlineChanges: OfflineChange[] = JSON.parse(offlineChangesData)
      if (offlineChanges.length === 0) {
        console.log("No offline changes to sync")
        return true
      }

      console.log(`Syncing ${offlineChanges.length} offline changes...`)

      // Set syncing flag
      await AsyncStorage.setItem("isSyncing", "true")

      // Sort changes by timestamp
      offlineChanges.sort((a, b) => a.timestamp - b.timestamp)

      // Process each change
      const failedChanges: OfflineChange[] = []

      for (const change of offlineChanges) {
        try {
          switch (change.operation) {
            case "INSERT":
              await supabase.from(change.table_name).insert(change.data)
              break

            case "UPDATE":
              await supabase.from(change.table_name).update(change.data).eq("id", change.record_id)
              break

            case "DELETE":
              await supabase.from(change.table_name).delete().eq("id", change.record_id)
              break
          }

          console.log(`Successfully synced change: ${change.operation} on ${change.table_name}`)
        } catch (error) {
          console.error(`Error syncing change: ${change.operation} on ${change.table_name}`, error)
          failedChanges.push(change)
        }
      }

      // Update offline changes with only failed ones
      if (failedChanges.length > 0) {
        await AsyncStorage.setItem("offlineChanges", JSON.stringify(failedChanges))
        console.log(`${failedChanges.length} changes failed to sync and will be retried later`)
      } else {
        await AsyncStorage.removeItem("offlineChanges")
        console.log("All changes synced successfully")
      }

      // Clear syncing flag
      await AsyncStorage.setItem("isSyncing", "false")

      return failedChanges.length === 0
    } catch (error) {
      console.error("Error syncing offline changes:", error)
      await AsyncStorage.setItem("isSyncing", "false")
      return false
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
  // Check if there are pending offline changes
  async hasPendingChanges() {
    try {
      const offlineChangesData = await AsyncStorage.getItem("offlineChanges")
      if (!offlineChangesData) return false

      const offlineChanges: OfflineChange[] = JSON.parse(offlineChangesData)
      return offlineChanges.length > 0
    } catch (error) {
      console.error("Error checking pending changes:", error)
      return false
    }
  },

  // Get the count of pending offline changes
  async getPendingChangesCount() {
    try {
      const offlineChangesData = await AsyncStorage.getItem("offlineChanges")
      if (!offlineChangesData) return 0

      const offlineChanges: OfflineChange[] = JSON.parse(offlineChangesData)
      return offlineChanges.length
    } catch (error) {
      console.error("Error getting pending changes count:", error)
      return 0
    }
  },

  // Clear all cached data
  async clearCache() {
    try {
      // Clear in-memory cache
      Object.keys(cache).forEach((key) => {
        delete cache[key]
      })

      // Clear AsyncStorage cache
      const keys = ["cachedProjects", "cachedTasks", "cachedProfile", "cachedNotifications", "cachedGithub"]

      await AsyncStorage.multiRemove(keys)
      console.log("Cache cleared successfully")
      return true
    } catch (error) {
      console.error("Error clearing cache:", error)
      return false
    }
  },
}
