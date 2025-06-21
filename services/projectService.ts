import { databases, account, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite"
import { offlineStore } from "./offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Project } from "@/types/appwrite"
import { ID, Query } from 'appwrite'

// Custom UUID generation function for React Native
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export type { Project }
export type NewProject = Omit<Project, '$id' | '$createdAt' | '$updatedAt'>
export type UpdateProject = Partial<NewProject>

// Cache keys
const PROJECTS_CACHE_KEY = "projects_cache"
const PROJECT_DETAILS_CACHE_KEY = "project_details_cache_"

// Check if device is online
export const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected === true
}

// Get all projects
export const getProjects = async (): Promise<Project[]> => {
  try {
    const online = await isOnline()

    // Try to get from cache first
    const cachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)

    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)

      // Use cache if offline or if cache is fresh (less than 5 minutes old)
      const isCacheFresh = Date.now() - timestamp < 5 * 60 * 1000
      if (!online || isCacheFresh) {
        return data
      }
    }

    if (!online) {
      // If offline and no cache, return empty array
      return []
    }

    // Get current user
    const user = await account.get()

    // Get projects
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PROJECTS,
      [
        Query.equal('owner_id', user.$id),
        Query.orderDesc('$updatedAt')
      ]
    )

    const projects = documents as unknown as Project[]

    // Cache the result
    await AsyncStorage.setItem(
      PROJECTS_CACHE_KEY,
      JSON.stringify({
        data: projects,
        timestamp: Date.now(),
      }),
    )

    return projects || []
  } catch (error) {
    console.error("Error getting projects:", error)

    // Try to get from cache as fallback
    try {
      const cachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached projects:", cacheError)
    }

    return []
  }
}

// Get project by ID
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    // Validate projectId
    if (!projectId || projectId.trim() === '') {
      console.warn('getProjectById: projectId is empty or invalid')
      return null
    }

    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = PROJECT_DETAILS_CACHE_KEY + projectId
    const cachedData = await AsyncStorage.getItem(cacheKey)

    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)

      // Use cache if offline or if cache is fresh (less than 5 minutes old)
      const isCacheFresh = Date.now() - timestamp < 5 * 60 * 1000
      if (!online || isCacheFresh) {
        return data
      }
    }

    if (!online) {
      // If offline and no cache, return null
      return null
    }

    // Get project details
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PROJECTS,
      projectId
    ) as unknown as Project

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: project,
        timestamp: Date.now(),
      }),
    )

    return project
  } catch (error) {
    console.error("Error getting project by ID:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = PROJECT_DETAILS_CACHE_KEY + projectId
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached project details:", cacheError)
    }

    return null
  }
}

// Create a new project
export const createProject = async (projectData: NewProject): Promise<Project> => {
  try {
    const online = await isOnline()
    const now = new Date().toISOString()

    // Get current user
    const user = await account.get()

    // Ensure user has a profile
    const { documents: profiles } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PROFILES,
      [Query.equal('user_id', user.$id)]
    )

    let profile = profiles[0]

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.PROFILES,
        ID.unique(),
        {
          user_id: user.$id,
          role: 'user',
          full_name: user.name,
          avatar_url: null,
          theme: null,
          push_token: null
        }
      )
    }

    const newProject = {
      ...projectData,
      owner_id: user.$id,
      progress: projectData.progress || 0
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTION_IDS.PROJECTS,
        record_id: ID.unique(),
        operation: "INSERT",
        data: newProject,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateProjectsCache(newProject as Project)

      return newProject as Project
    }

    // If online, create project
    const createdProject = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.PROJECTS,
      ID.unique(),
      newProject
    ) as unknown as Project

    // Update cache
    await updateProjectsCache(createdProject)

    return createdProject
  } catch (error) {
    console.error("Error creating project:", error)
    throw error
  }
}

// Update a project
export const updateProject = async (projectId: string, updates: UpdateProject): Promise<Project> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTION_IDS.PROJECTS,
        record_id: projectId,
        operation: "UPDATE",
        data: updates,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateProjectCache(projectId, updates)

      return { $id: projectId, ...updates } as Project
    }

    // If online, update project
    const updatedProject = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PROJECTS,
      projectId,
      updates
    ) as unknown as Project

    // Update cache
    await updateProjectCache(projectId, updatedProject)

    return updatedProject
  } catch (error) {
    console.error("Error updating project:", error)
    throw error
  }
}

// Delete a project
export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTION_IDS.PROJECTS,
        record_id: projectId,
        operation: "DELETE",
        data: null,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await removeProjectFromCache(projectId)

      return true
    }

    // If online, delete project
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_IDS.PROJECTS,
      projectId
    )

    // Update cache
    await removeProjectFromCache(projectId)

    return true
  } catch (error) {
    console.error("Error deleting project:", error)
    throw error
  }
}

// Helper functions for cache management
const updateProjectsCache = async (newProject: Project) => {
  try {
    const cachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = [newProject, ...data.filter((p: Project) => p.$id !== newProject.$id)]
      await AsyncStorage.setItem(
        PROJECTS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
        timestamp: Date.now(),
        })
    )
    }
  } catch (error) {
    console.error("Error updating projects cache:", error)
  }
}

const updateProjectCache = async (projectId: string, updates: any) => {
  try {
    const cacheKey = PROJECT_DETAILS_CACHE_KEY + projectId
    const cachedData = await AsyncStorage.getItem(cacheKey)
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = { ...data, ...updates }
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: updatedData,
          timestamp: Date.now(),
        })
      )
    }
  } catch (error) {
    console.error("Error updating project cache:", error)
  }
}

const removeProjectFromCache = async (projectId: string) => {
  try {
    // Remove from projects list cache
    const cachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = data.filter((p: Project) => p.$id !== projectId)
      await AsyncStorage.setItem(
        PROJECTS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp: Date.now(),
        })
      )
    }

    // Remove project details cache
    const cacheKey = PROJECT_DETAILS_CACHE_KEY + projectId
    await AsyncStorage.removeItem(cacheKey)
  } catch (error) {
    console.error("Error removing project from cache:", error)
  }
}

// Export the projectService object
export const projectService = {
  isOnline,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
}
