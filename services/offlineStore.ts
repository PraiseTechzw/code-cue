import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import { supabase } from "@/lib/supabase"
import type { Project } from "./projectService"
import type { Task } from "./taskService"

// Types
export type OfflineChange = {
  id: string
  table_name: string
  record_id: string
  operation: "INSERT" | "UPDATE" | "DELETE"
  data: any
  created_at: string
  synced: boolean
  retry_count: number
}

export type SyncProgress = {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  lastSyncTime: number | null
  error: string | null
}

// Keys for AsyncStorage
const OFFLINE_CHANGES_KEY = "offline_changes"
const LAST_SYNC_TIME_KEY = "last_sync_TIME"

// Event listeners
type SyncListener = (progress: SyncProgress) => void
const syncListeners: SyncListener[] = []

// Initial sync progress state
let syncProgress: SyncProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  inProgress: false,
  lastSyncTime: null,
  error: null,
}

// Add a sync listener
export const addSyncListener = (listener: SyncListener) => {
  syncListeners.push(listener)
  // Immediately notify with current state
  listener({ ...syncProgress })
  return () => {
    const index = syncListeners.indexOf(listener)
    if (index !== -1) {
      syncListeners.splice(index, 1)
    }
  }
}

// Notify all listeners
const notifyListeners = () => {
  syncListeners.forEach((listener) => listener({ ...syncProgress }))
}

// Reset sync progress
const resetSyncProgress = () => {
  syncProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
    lastSyncTime: syncProgress.lastSyncTime,
    error: null,
  }
  notifyListeners()
}

// Update sync progress
const updateSyncProgress = (update: Partial<SyncProgress>) => {
  syncProgress = { ...syncProgress, ...update }
  notifyListeners()
}

// Cache for in-memory data
const cache: Record<string, any> = {}

// Function to generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Helper function to check internet connectivity
const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected !== null && netInfo.isConnected
}

// Helper functions for offline changes
const getOfflineChanges = async (): Promise<OfflineChange[]> => {
  try {
    const offlineChangesData = await AsyncStorage.getItem(OFFLINE_CHANGES_KEY)
    return offlineChangesData ? JSON.parse(offlineChangesData) : []
  } catch (error) {
    console.error("Error getting offline changes from AsyncStorage:", error)
    return []
  }
}

const getPendingChangesCount = async (): Promise<number> => {
  const offlineChanges = await getOfflineChanges()
  return offlineChanges.length
}

const addOfflineChange = async (change: OfflineChange): Promise<void> => {
  try {
    const offlineChanges = await getOfflineChanges()
    const updatedOfflineChanges = [...offlineChanges, change]
    await AsyncStorage.setItem(OFFLINE_CHANGES_KEY, JSON.stringify(updatedOfflineChanges))
  } catch (error) {
    console.error("Error adding offline change to AsyncStorage:", error)
  }
}

const markChangeSynced = async (id: string): Promise<void> => {
  try {
    const offlineChanges = await getOfflineChanges()
    const updatedOfflineChanges = offlineChanges.map((change) =>
      change.id === id ? { ...change, synced: true } : change,
    )
    await AsyncStorage.setItem(OFFLINE_CHANGES_KEY, JSON.stringify(updatedOfflineChanges))
  } catch (error) {
    console.error("Error marking offline change as synced in AsyncStorage:", error)
  }
}

const removeChange = async (id: string): Promise<void> => {
  try {
    const offlineChanges = await getOfflineChanges()
    const updatedOfflineChanges = offlineChanges.filter((change) => change.id !== id)
    await AsyncStorage.setItem(OFFLINE_CHANGES_KEY, JSON.stringify(updatedOfflineChanges))
  } catch (error) {
    console.error("Error removing offline change from AsyncStorage:", error)
  }
}

const clearSyncedChanges = async (): Promise<void> => {
  try {
    const offlineChanges = await getOfflineChanges()
    const updatedOfflineChanges = offlineChanges.filter((change) => !change.synced)
    await AsyncStorage.setItem(OFFLINE_CHANGES_KEY, JSON.stringify(updatedOfflineChanges))
  } catch (error) {
    console.error("Error clearing synced offline changes from AsyncStorage:", error)
  }
}

const syncOfflineChanges = async (): Promise<void> => {
  if (syncProgress.inProgress) {
    console.log("Sync already in progress, skipping...")
    return
  }

  try {
    updateSyncProgress({ inProgress: true, error: null })
    const offlineChanges = await getOfflineChanges()
    const unsyncedChanges = offlineChanges.filter((change) => !change.synced)

    if (unsyncedChanges.length === 0) {
      console.log("No offline changes to sync.")
      updateSyncProgress({ inProgress: false })
      return
    }

    updateSyncProgress({ total: unsyncedChanges.length, completed: 0, failed: 0 })

    for (const change of unsyncedChanges) {
      try {
        let response
        switch (change.operation) {
          case "INSERT":
            response = await supabase.from(change.table_name).insert(change.data)
            break
          case "UPDATE":
            response = await supabase.from(change.table_name).update(change.data).eq("id", change.record_id)
            break
          case "DELETE":
            response = await supabase.from(change.table_name).delete().eq("id", change.record_id)
            break
          default:
            throw new Error(`Unknown operation: ${change.operation}`)
        }

        if (response?.error) {
          console.error(
            `Failed to sync ${change.operation} for ${change.table_name} (ID: ${change.record_id}):`,
            response.error,
          )
          updateSyncProgress({ failed: syncProgress.failed + 1 })
        } else {
          await markChangeSynced(change.id)
          updateSyncProgress({ completed: syncProgress.completed + 1 })
        }
      } catch (error: any) {
        console.error(`Failed to sync ${change.operation} for ${change.table_name} (ID: ${change.record_id}):`, error)
        updateSyncProgress({ failed: syncProgress.failed + 1, error: error.message || "Sync error" })
      }
    }

    const now = Date.now()
    await setLastSyncTime(now)
    updateSyncProgress({ inProgress: false, lastSyncTime: now })
    console.log("Offline changes synced successfully.")
  } catch (error: any) {
    console.error("Error syncing offline changes:", error)
    updateSyncProgress({ inProgress: false, error: error.message || "Sync error" })
  } finally {
    updateSyncProgress({ inProgress: false })
  }
}

const getLastSyncTime = async (): Promise<number | null> => {
  try {
    const lastSyncTime = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY)
    return lastSyncTime ? Number.parseInt(lastSyncTime, 10) : null
  } catch (error) {
    console.error("Error getting last sync time from AsyncStorage:", error)
    return null
  }
}

const setLastSyncTime = async (time: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, time.toString())
  } catch (error) {
    console.error("Error setting last sync time in AsyncStorage:", error)
  }
}

// Initialize the offlineStore
export const initOfflineStore = async () => {
  try {
    // Load last sync time
    const lastSyncTime = await getLastSyncTime()
    updateSyncProgress({ lastSyncTime })

    // Set up network change listener
    NetInfo.addEventListener((state) => {
      // If connection is restored, try to sync
      if (state.isConnected && !state.isConnectedPreviously) {
        syncOfflineChanges()
      }
    })
  } catch (error) {
    console.error("Error initializing offline store:", error)
  }
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
  isOnline,

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
  getOfflineChanges,

  getPendingChangesCount,

  addOfflineChange,

  markChangeSynced,

  removeChange,

  clearSyncedChanges,

  syncOfflineChanges,

  getLastSyncTime,

  setLastSyncTime,

  addSyncListener,

  initOfflineStore,

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
  async getPendingChangesCountOld() {
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
  // Set the last sync time
  async setLastSyncTimeOld(time: string): Promise<void> {
    try {
      await AsyncStorage.setItem("lastSyncTime", time)
    } catch (error) {
      console.error("Error setting last sync time:", error)
    }
  },

  // Get the last sync time
  async getLastSyncTimeOld(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("lastSyncTime")
    } catch (error) {
      console.error("Error getting last sync time:", error)
      return null
    }
  },
}
