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
export const syncOfflineChanges = async (): Promise<void> => {
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
      return
    }

    console.log(`Syncing ${unsyncedChanges.length} offline changes`)

    for (const change of unsyncedChanges) {
      try {
        await processOfflineChange(change)
        
        // Mark as synced
        change.synced = true
        await updateOfflineChange(change)
        
        console.log(`Successfully synced change: ${change.operation} on ${change.table_name}`)
      } catch (error) {
        console.error(`Error syncing change ${change.id}:`, error)
        
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
    }
  } catch (error) {
    console.error("Error syncing offline changes:", error)
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
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        // Sync when connection is restored
        syncOfflineChanges()
      }
    })

    // Initial sync attempt
    await syncOfflineChanges()
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

export const offlineStore = {
  addOfflineChange,
  getOfflineChanges,
  syncOfflineChanges,
  initializeOfflineStore,
  cacheUserData,
  clearCache,
  setItem,
  getItem,
  removeItem
} 
