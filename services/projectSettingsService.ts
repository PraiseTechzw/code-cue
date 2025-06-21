import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ID, Query } from 'appwrite'
import { offlineStore } from "./offlineStore"

const SETTINGS_CACHE_KEY = "project_settings_cache_"

export type ProjectSettings = {
  $id: string
  project_id: string
  auto_assign_tasks: boolean
  require_time_tracking: boolean
  enable_budget_tracking: boolean
  notification_preferences?: string
  workflow_settings?: string
  access_control?: string
}

export const getProjectSettings = async (projectId: string): Promise<ProjectSettings | null> => {
  try {
    if (!projectId) return null
    // Try cache first
    const cacheKey = SETTINGS_CACHE_KEY + projectId
    const cached = await AsyncStorage.getItem(cacheKey)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const isFresh = Date.now() - timestamp < 5 * 60 * 1000
      if (isFresh) return data
    }
    // Query Appwrite
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_SETTINGS,
      [Query.equal('project_id', projectId)]
    )
    const settings = documents[0] as ProjectSettings | undefined
    if (settings) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: settings, timestamp: Date.now() }))
      return settings
    }
    return null
  } catch (e) {
    console.error('Error fetching project settings:', e)
    return null
  }
}

export const updateProjectSettings = async (settingsId: string, updates: Partial<ProjectSettings>): Promise<ProjectSettings | null> => {
  try {
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_SETTINGS,
      settingsId,
      updates
    ) as ProjectSettings
    // Update cache
    if (updated.project_id) {
      const cacheKey = SETTINGS_CACHE_KEY + updated.project_id
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: updated, timestamp: Date.now() }))
    }
    return updated
  } catch (e) {
    console.error('Error updating project settings:', e)
    return null
  }
}

export const createProjectSettings = async (projectId: string, defaults: Partial<ProjectSettings> = {}): Promise<ProjectSettings | null> => {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_SETTINGS,
      ID.unique(),
      {
        project_id: projectId,
        auto_assign_tasks: false,
        require_time_tracking: false,
        enable_budget_tracking: false,
        ...defaults
      }
    ) as ProjectSettings
    // Cache
    const cacheKey = SETTINGS_CACHE_KEY + projectId
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: doc, timestamp: Date.now() }))
    return doc
  } catch (e) {
    console.error('Error creating project settings:', e)
    return null
  }
}

export const projectSettingsService = {
  getProjectSettings,
  updateProjectSettings,
  createProjectSettings,
} 