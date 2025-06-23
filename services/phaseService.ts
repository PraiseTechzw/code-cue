import { databases, account, ID, Query } from "@/lib/appwrite"
import { DATABASE_ID, COLLECTIONS, COLLECTION_IDS } from "@/lib/appwrite"
import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from '@react-native-community/netinfo'
import { Phase } from "@/types/appwrite"

// Cache keys
const PHASES_CACHE_KEY = "phases_cache"
const PROJECT_PHASES_CACHE_KEY = "project_phases_cache_"
const PHASE_DETAILS_CACHE_KEY = "phase_details_cache_"

// Check if device is online
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch()
  return state.isConnected === true
}

// Get phases by project
export const getPhasesByProject = async (projectId: string): Promise<Phase[]> => {
  try {
    // Validate projectId
    if (!projectId || projectId.trim() === '') {
      console.warn('getPhasesByProject: projectId is empty or invalid')
      return []
    }

    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = PROJECT_PHASES_CACHE_KEY + projectId
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
      // If offline and no cache, return empty array
      return []
    }

    // Get phases for project
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PHASES,
      [
        Query.equal('project_id', projectId),
        Query.orderAsc('order')
      ]
    )

    const phases = documents as unknown as Phase[]

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: phases,
        timestamp: Date.now(),
      }),
    )

    return phases || []
  } catch (error) {
    console.error("Error getting phases by project:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = PROJECT_PHASES_CACHE_KEY + projectId
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached phases by project:", cacheError)
    }

    return []
  }
}

// Get phase by ID
export const getPhaseById = async (phaseId: string): Promise<Phase | null> => {
  try {
    // Validate phaseId
    if (!phaseId || phaseId.trim() === '') {
      console.warn('getPhaseById: phaseId is empty or invalid')
      return null
    }

    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = PHASE_DETAILS_CACHE_KEY + phaseId
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

    // Get phase details
    const phase = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PHASES,
      phaseId
    ) as unknown as Phase

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: phase,
        timestamp: Date.now(),
      }),
    )

    return phase
  } catch (error) {
    console.error("Error getting phase by ID:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = PHASE_DETAILS_CACHE_KEY + phaseId
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached phase details:", cacheError)
    }

    return null
  }
}

// Create a new phase
export const createPhase = async (phaseData: Omit<Phase, '$id' | '$createdAt' | '$updatedAt'>): Promise<Phase> => {
  try {
    const online = await isOnline()

    // Get current user
    const user = await account.get()

    const newPhase = {
      ...phaseData,
      order: phaseData.order || 0,
      progress: phaseData.progress || 0,
      weight: phaseData.weight || 0,
      dependencies: phaseData.dependencies || [],
    }

    if (!online) {
      // If offline, queue for later
      await AsyncStorage.setItem(
        `offline_phase_${Date.now()}`,
        JSON.stringify({
          operation: 'CREATE',
          data: newPhase,
          timestamp: Date.now()
        })
      )

      // Create temporary ID for offline use
      const tempPhase = {
        ...newPhase,
        $id: `temp_${Date.now()}`,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      }

      return tempPhase as Phase
    }

    // If online, create phase
    const createdPhase = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.PHASES,
      ID.unique(),
      newPhase
    ) as unknown as Phase

    // Update cache
    await updatePhasesCache(createdPhase)

    return createdPhase
  } catch (error) {
    console.error("Error creating phase:", error)
    throw error
  }
}

// Update a phase
export const updatePhase = async (phaseId: string, updates: Partial<Phase>): Promise<Phase> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await AsyncStorage.setItem(
        `offline_phase_update_${Date.now()}`,
        JSON.stringify({
          operation: 'UPDATE',
          phaseId,
          data: updates,
          timestamp: Date.now()
        })
      )

      // Return optimistic update
      const currentPhase = await getPhaseById(phaseId)
      if (currentPhase) {
        const updatedPhase = { ...currentPhase, ...updates, $updatedAt: new Date().toISOString() }
        await updatePhasesCache(updatedPhase)
        return updatedPhase
      }
      throw new Error('Phase not found')
    }

    // If online, update phase
    const updatedPhase = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PHASES,
      phaseId,
      updates
    ) as unknown as Phase

    // Update cache
    await updatePhasesCache(updatedPhase)

    return updatedPhase
  } catch (error) {
    console.error("Error updating phase:", error)
    throw error
  }
}

// Delete a phase
export const deletePhase = async (phaseId: string): Promise<void> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await AsyncStorage.setItem(
        `offline_phase_delete_${Date.now()}`,
        JSON.stringify({
          operation: 'DELETE',
          phaseId,
          timestamp: Date.now()
        })
      )

      // Remove from cache
      await AsyncStorage.removeItem(PHASE_DETAILS_CACHE_KEY + phaseId)
      return
    }

    // If online, delete phase
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_IDS.PHASES,
      phaseId
    )

    // Remove from cache
    await AsyncStorage.removeItem(PHASE_DETAILS_CACHE_KEY + phaseId)
  } catch (error) {
    console.error("Error deleting phase:", error)
    throw error
  }
}

// Update phases cache
const updatePhasesCache = async (phase: Phase) => {
  try {
    // Update project phases cache
    const cacheKey = PROJECT_PHASES_CACHE_KEY + phase.project_id
    const cachedData = await AsyncStorage.getItem(cacheKey)

    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedPhases = data.map((p: Phase) => 
        p.$id === phase.$id ? phase : p
      )
      
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: updatedPhases,
          timestamp: Date.now(),
        }),
      )
    }

    // Update phase details cache
    await AsyncStorage.setItem(
      PHASE_DETAILS_CACHE_KEY + phase.$id,
      JSON.stringify({
        data: phase,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("Error updating phases cache:", error)
  }
}

// Calculate project progress based on phases
export const calculateProjectProgress = async (projectId: string): Promise<number> => {
  try {
    const phases = await getPhasesByProject(projectId)
    
    if (phases.length === 0) return 0

    const totalWeight = phases.reduce((sum, phase) => sum + phase.weight, 0)
    const weightedProgress = phases.reduce((sum, phase) => {
      return sum + (phase.progress * phase.weight / 100)
    }, 0)

    return totalWeight > 0 ? Math.round(weightedProgress / totalWeight * 100) : 0
  } catch (error) {
    console.error("Error calculating project progress:", error)
    return 0
  }
}

// Add a function to recalculate and update project progress after phase progress changes
export const recalculateProjectProgress = async (projectId: string) => {
  try {
    const progress = await calculateProjectProgress(projectId)
    // Update the project document with the new progress
    const { projectService } = await import('./projectService')
    await projectService.updateProject(projectId, { progress })
    return progress
  } catch (error) {
    console.error('Error recalculating project progress:', error)
    return 0
  }
}

// In recalculatePhaseProgress, after updating phase, recalculate project progress
export const recalculatePhaseProgress = async (phaseId: string) => {
  try {
    // Get all tasks for this phase
    const tasks = await import('./taskService').then(m => m.taskService.getTasks({ phaseId }))
    if (!tasks || tasks.length === 0) {
      const phase = await getPhaseById(phaseId)
      if (phase) {
        await updatePhase(phaseId, { progress: 0 })
        await recalculateProjectProgress(phase.project_id)
      }
      return 0
    }
    const doneCount = tasks.filter((t: any) => t.status === 'done').length
    const progress = Math.round((doneCount / tasks.length) * 100)
    const phase = await getPhaseById(phaseId)
    if (phase) {
      await updatePhase(phaseId, { progress })
      await recalculateProjectProgress(phase.project_id)
    }
    return progress
  } catch (error) {
    console.error('Error recalculating phase progress:', error)
    return 0
  }
}

// Export the phaseService object
export const phaseService = {
  isOnline,
  getPhasesByProject,
  getPhaseById,
  createPhase,
  updatePhase,
  deletePhase,
  calculateProjectProgress,
  recalculatePhaseProgress,
  recalculateProjectProgress,
} 