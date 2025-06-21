import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import type { Project } from "./projectService"
import type { Task } from "./taskService"
import { ID } from 'appwrite'

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

// Cache keys
const CACHE_KEYS = {
  OFFLINE_CHANGES: 'offline_changes',
  PROJECTS: 'projects_cache',
  TASKS: 'tasks_cache',
  NOTIFICATIONS: 'notifications_cache',
  PROFILES: 'profiles_cache'
}

// Check if device is online
const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected === true
}

// Add offline change
export const addOfflineChange = async (change: OfflineChange): Promise<void> => {
  try {
    const changes = await getOfflineChanges()
    changes.push(change)
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_CHANGES, JSON.stringify(changes))
  } catch (error) {
    console.error("Error adding offline change:", error)
  }
}

// Get offline changes
export const getOfflineChanges = async (): Promise<OfflineChange[]> => {
  try {
    const changesJson = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_CHANGES)
    return changesJson ? JSON.parse(changesJson) : []
  } catch (error) {
    console.error("Error getting offline changes:", error)
    return []
  }
}

// Sync offline changes
export const syncOfflineChanges = async (progressCallback?: (progress: any) => void): Promise<void> => {
  try {
    const online = await isOnline()
    if (!online) {
      console.log("Device is offline, skipping sync")
    return
  }

    const changes = await getOfflineChanges()
    const unsyncedChanges = changes.filter(change => !change.synced)

    if (unsyncedChanges.length === 0) {
      console.log("No unsynced changes to process")
      if (progressCallback) {
        progressCallback({
          total: 0,
          completed: 0,
          failed: 0,
          inProgress: false,
          lastSyncTime: Date.now(),
          error: null
        })
      }
      return
    }

    console.log(`Syncing ${unsyncedChanges.length} offline changes`)

    // Initialize progress
    let completed = 0
    let failed = 0
    const total = unsyncedChanges.length

    if (progressCallback) {
      progressCallback({
        total,
        completed,
        failed,
        inProgress: true,
        lastSyncTime: null,
        error: null
      })
    }

    for (const change of unsyncedChanges) {
      try {
        await processOfflineChange(change)
        
        // Mark as synced
        change.synced = true
        await updateOfflineChange(change)
        
        completed++
        console.log(`Successfully synced change: ${change.operation} on ${change.table_name}`)
      } catch (error) {
        console.error(`Error syncing change ${change.id}:`, error)
        failed++
        
        // Increment retry count
        change.retry_count += 1
        
        // Remove if too many retries
        if (change.retry_count >= 3) {
          await removeOfflineChange(change.id)
          console.log(`Removed change ${change.id} after ${change.retry_count} failed attempts`)
        } else {
          await updateOfflineChange(change)
        }
      }

      // Update progress
      if (progressCallback) {
        progressCallback({
          total,
          completed,
          failed,
          inProgress: true,
          lastSyncTime: null,
          error: null
        })
      }
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({
        total,
        completed,
        failed,
        inProgress: false,
        lastSyncTime: Date.now(),
        error: failed > 0 ? `${failed} changes failed to sync` : null
      })
    }
  } catch (error) {
    console.error("Error syncing offline changes:", error)
    if (progressCallback) {
      progressCallback({
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: false,
        lastSyncTime: null,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
}

// Process individual offline change
const processOfflineChange = async (change: OfflineChange): Promise<void> => {
  const collectionName = getCollectionName(change.table_name)
  
  switch (change.operation) {
    case "INSERT":
      await databases.createDocument(
        DATABASE_ID,
        collectionName,
        change.record_id,
        change.data
      )
      break
      
    case "UPDATE":
      await databases.updateDocument(
        DATABASE_ID,
        collectionName,
        change.record_id,
        change.data
      )
      break
      
    case "DELETE":
      await databases.deleteDocument(
        DATABASE_ID,
        collectionName,
        change.record_id
      )
      break
      
    default:
      throw new Error(`Unknown operation: ${change.operation}`)
  }
}

// Get collection name from table name
const getCollectionName = (tableName: string): string => {
  const collectionMap: Record<string, string> = {
    'profiles': COLLECTIONS.PROFILES,
    'projects': COLLECTIONS.PROJECTS,
    'tasks': COLLECTIONS.TASKS,
    'subtasks': COLLECTIONS.SUBTASKS,
    'comments': COLLECTIONS.COMMENTS,
    'notifications': COLLECTIONS.NOTIFICATIONS,
    'github_repositories': COLLECTIONS.GITHUB_REPOSITORIES,
    'github_commits': COLLECTIONS.GITHUB_COMMITS,
    'github_connections': COLLECTIONS.GITHUB_CONNECTIONS
  }
  
  return collectionMap[tableName] || tableName
}

// Update offline change
const updateOfflineChange = async (updatedChange: OfflineChange): Promise<void> => {
  try {
    const changes = await getOfflineChanges()
    const index = changes.findIndex(change => change.id === updatedChange.id)
    
    if (index !== -1) {
      changes[index] = updatedChange
      await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_CHANGES, JSON.stringify(changes))
    }
  } catch (error) {
    console.error("Error updating offline change:", error)
  }
}

// Remove offline change
const removeOfflineChange = async (changeId: string): Promise<void> => {
  try {
    const changes = await getOfflineChanges()
    const filteredChanges = changes.filter(change => change.id !== changeId)
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_CHANGES, JSON.stringify(filteredChanges))
  } catch (error) {
    console.error("Error removing offline change:", error)
  }
}

// Cache management functions
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting item ${key}:`, error)
  }
}

export const getItem = async (key: string): Promise<any> => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error(`Error getting item ${key}:`, error)
    return null
  }
}

export const removeItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing item ${key}:`, error)
  }
}

// Initialize offline store
export const initializeOfflineStore = async (): Promise<void> => {
  try {
    // Set up network listener
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        // Sync when connection is restored
        syncOfflineChanges()
      }
    })

    // Initial sync attempt
    await syncOfflineChanges()

    // Note: We don't return the unsubscribe function here since this is a one-time initialization
    // The listener will be cleaned up when the app is closed
  } catch (error) {
    console.error("Error initializing offline store:", error)
  }
}

// Cache all user data
export const cacheUserData = async (): Promise<void> => {
  try {
    const user = await account.get()
    if (!user) return

    // Cache projects
    const { documents: projects } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      []
    )
    await setItem(CACHE_KEYS.PROJECTS, projects)

    // Cache tasks
    const { documents: tasks } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      []
    )
    await setItem(CACHE_KEYS.TASKS, tasks)

    // Cache notifications
    const { documents: notifications } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      []
    )
    await setItem(CACHE_KEYS.NOTIFICATIONS, notifications)

    // Cache profile
    const { documents: profiles } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      []
    )
    if (profiles.length > 0) {
      await setItem(CACHE_KEYS.PROFILES, profiles[0])
    }

    console.log("User data cached successfully")
  } catch (error) {
    console.error("Error caching user data:", error)
  }
}

// Clear all cached data
export const clearCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.OFFLINE_CHANGES,
      CACHE_KEYS.PROJECTS,
      CACHE_KEYS.TASKS,
      CACHE_KEYS.NOTIFICATIONS,
      CACHE_KEYS.PROFILES
    ])
    console.log("Cache cleared successfully")
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

// Offline store object
export const offlineStore = {
  async loadCachedData() {
    try {
      const cachedData = {
        projects: await getItem(CACHE_KEYS.PROJECTS) || [],
        tasks: await getItem(CACHE_KEYS.TASKS) || [],
        notifications: await getItem(CACHE_KEYS.NOTIFICATIONS) || [],
        profiles: await getItem(CACHE_KEYS.PROFILES) || []
      }
      
      return cachedData
    } catch (error) {
      console.error("Error loading cached data:", error)
      return {
        projects: [],
        tasks: [],
        notifications: [],
        profiles: []
      }
    }
  },

  async persistCachedData(data: any) {
    try {
      if (data.projects) await setItem(CACHE_KEYS.PROJECTS, data.projects)
      if (data.tasks) await setItem(CACHE_KEYS.TASKS, data.tasks)
      if (data.notifications) await setItem(CACHE_KEYS.NOTIFICATIONS, data.notifications)
      if (data.profiles) await setItem(CACHE_KEYS.PROFILES, data.profiles)
    } catch (error) {
      console.error("Error persisting cached data:", error)
    }
  },

  async enableOfflineMode() {
    try {
      await AsyncStorage.setItem('offline_mode', 'true')
      console.log("Offline mode enabled")
    } catch (error) {
      console.error("Error enabling offline mode:", error)
    }
  },

  async disableOfflineMode() {
    try {
      await AsyncStorage.setItem('offline_mode', 'false')
      console.log("Offline mode disabled")
    } catch (error) {
      console.error("Error disabling offline mode:", error)
    }
  },

  async getData(key: string, fetchFunction: () => Promise<any>) {
    try {
      // Try to get from cache first
      const cached = await getItem(key)
      if (cached) return cached

      // If not in cache, fetch and cache
      const data = await fetchFunction()
      if (data) await setItem(key, data)
      return data
    } catch (error) {
      console.error(`Error getting data for key ${key}:`, error)
      return null
    }
  },

  async getPendingChangesCount() {
    try {
      const changes = await getOfflineChanges()
      return changes.filter(change => !change.synced).length
    } catch (error) {
      console.error("Error getting pending changes count:", error)
      return 0
    }
  },

  async addSyncListener(callback: (progress?: any) => void) {
    // Set up network status listener for sync
    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // When connection is restored, trigger sync with default progress
        const defaultProgress = {
          total: 0,
          completed: 0,
          failed: 0,
          inProgress: false,
          lastSyncTime: Date.now(),
          error: null
        }
        callback(defaultProgress)
      }
    })
    
    // Return a function that properly removes the listener
    return () => {
      if (netInfoUnsubscribe) {
        netInfoUnsubscribe()
      }
    }
  },

  async initialize() {
    return await initializeOfflineStore()
  },

  async cacheUserData() {
    return await cacheUserData()
  },

  async syncOfflineChanges(progressCallback?: (progress: any) => void) {
    return await syncOfflineChanges(progressCallback)
  },

  async addOfflineChange(change: OfflineChange) {
    return await addOfflineChange(change)
  },

  async getOfflineChanges() {
    return await getOfflineChanges()
  },

  async setItem(key: string, value: any) {
    return await setItem(key, value)
  },

  async getItem(key: string) {
    return await getItem(key)
  },

  async removeItem(key: string) {
    return await removeItem(key)
  },

  async clearCache() {
    return await clearCache()
  }
}
