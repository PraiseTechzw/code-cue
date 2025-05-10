import { supabase } from "@/lib/supabase"
import { offlineStore } from "./offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Database } from "@/types/supabase"

// Custom UUID generation function for React Native
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type NewProject = Database["public"]["Tables"]["projects"]["Insert"]
export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"]

// Cache keys
const PROJECTS_CACHE_KEY = "projects_cache"
const PROJECT_DETAILS_CACHE_KEY = "project_details_cache_"

// Check if device is online
export const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected === true
}

// Get all projects
export const getProjects = async (): Promise<any[]> => {
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

    // Get projects
    const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false })

    if (error) throw error

    // Cache the result
    await AsyncStorage.setItem(
      PROJECTS_CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )

    return data || []
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
export const getProjectById = async (projectId: string): Promise<any> => {
  try {
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
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

    if (error) throw error

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )

    return data
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
export const createProject = async (projectData: any): Promise<any> => {
  try {
    const online = await isOnline()
    const projectId = generateUUID()
    const now = new Date().toISOString()

    // Get current user and ensure authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    // Log authentication state for debugging
    console.log("Auth state:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      authError: authError
    })

    if (authError) {
      console.error("Auth error:", authError)
      throw new Error("Authentication error: " + authError.message)
    }

    if (!session?.user) {
      throw new Error("No active session found. Please sign in again.")
    }

    // Ensure user has a profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    console.log("Profile check:", { profile, profileError })

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    // If profile exists but has no role, update it
    if (profile && !profile.role) {
      console.log("Updating profile to add role")
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'user',
          updated_at: now
        })
        .eq('id', session.user.id)
        .select()
        .single()

      console.log("Profile update result:", { updatedProfile, updateError })

      if (updateError) {
        throw new Error(`Failed to update profile with role: ${updateError.message}`)
      }

      if (!updatedProfile) {
        throw new Error("Profile update succeeded but no profile data returned")
      }

      profile = updatedProfile
    }

    // If no profile exists, create one
    if (!profile) {
      console.log("Creating new profile for user:", session.user.id)
      
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          role: 'user',
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      console.log("Profile creation result:", { newProfile, createProfileError })

      if (createProfileError) {
        throw new Error(`Failed to create user profile: ${createProfileError.message}`)
      }

      if (!newProfile) {
        throw new Error("Profile creation succeeded but no profile data returned")
      }

      profile = newProfile
    }

    // Double-check profile after creation/verification
    const { data: verifiedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    console.log("Verified profile:", { verifiedProfile, verifyError })

    if (verifyError || !verifiedProfile) {
      throw new Error("Failed to verify user profile after creation")
    }

    if (!verifiedProfile.role) {
      throw new Error("User profile is missing required role field")
    }

    // Prepare project data with owner_id
    const newProject = {
      id: projectId,
      ...projectData,
      owner_id: session.user.id,
      created_at: now,
      updated_at: now,
    }

    // Log project data for debugging
    console.log("Creating project with data:", {
      projectId,
      ownerId: session.user.id,
      hasName: !!projectData.name,
      hasDescription: !!projectData.description,
      userRole: verifiedProfile.role
    })

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        table_name: "projects",
        record_id: projectId,
        operation: "INSERT",
        data: newProject,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateProjectsCache(newProject)

      return newProject
    }

    // If online, create project with RLS enabled
    const { data, error } = await supabase
      .from("projects")
      .insert(newProject)
      .select()
      .single()

    if (error) {
      console.error("Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        projectData: {
          id: projectId,
          ownerId: session.user.id,
          name: projectData.name,
          description: projectData.description,
          userRole: verifiedProfile.role
        }
      })
      
      if (error.code === "42501") {
        throw new Error(
          `Permission denied. User ID: ${session.user.id}, Project ID: ${projectId}. ` +
          `User role: ${verifiedProfile.role}. ` +
          `Please ensure you have the correct permissions.`
        )
      }
      throw error
    }

    // Update cache
    await updateProjectsCache(data)

    return data
  } catch (error) {
    console.error("Error creating project:", error)
    throw error
  }
}

// Update a project
export const updateProject = async (projectId: string, updates: any): Promise<any> => {
  try {
    const online = await isOnline()
    const now = new Date().toISOString()

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: now,
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        table_name: "projects",
        record_id: projectId,
        operation: "UPDATE",
        data: updateData,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateProjectCache(projectId, updateData)

      return { id: projectId, ...updateData }
    }

    // If online, update project
    const { data, error } = await supabase.from("projects").update(updateData).eq("id", projectId).select().single()

    if (error) throw error

    // Update cache
    await updateProjectCache(projectId, data)

    return data
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
        id: generateUUID(),
        table_name: "projects",
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
    const { error } = await supabase.from("projects").delete().eq("id", projectId)

    if (error) throw error

    // Update cache
    await removeProjectFromCache(projectId)

    return true
  } catch (error) {
    console.error("Error deleting project:", error)
    throw error
  }
}

// Helper: Update projects cache with a new project
const updateProjectsCache = async (newProject: any) => {
  try {
    // Update all projects cache
    const cachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)

    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = [newProject, ...data]

      await AsyncStorage.setItem(
        PROJECTS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Add to project details cache
    const projectCacheKey = PROJECT_DETAILS_CACHE_KEY + newProject.id
    await AsyncStorage.setItem(
      projectCacheKey,
      JSON.stringify({
        data: newProject,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("Error updating projects cache:", error)
  }
}

// Helper: Update project cache with updates
const updateProjectCache = async (projectId: string, updates: any) => {
  try {
    // Update project details cache
    const projectCacheKey = PROJECT_DETAILS_CACHE_KEY + projectId
    const projectCachedData = await AsyncStorage.getItem(projectCacheKey)

    if (projectCachedData) {
      const { data, timestamp } = JSON.parse(projectCachedData)
      const updatedData = { ...data, ...updates }

      await AsyncStorage.setItem(
        projectCacheKey,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Update all projects cache
    const allProjectsCachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)

    if (allProjectsCachedData) {
      const { data, timestamp } = JSON.parse(allProjectsCachedData)
      const updatedData = data.map((project: any) => (project.id === projectId ? { ...project, ...updates } : project))

      await AsyncStorage.setItem(
        PROJECTS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }
  } catch (error) {
    console.error("Error updating project cache:", error)
  }
}

// Helper: Remove project from cache
const removeProjectFromCache = async (projectId: string) => {
  try {
    // Remove project details cache
    await AsyncStorage.removeItem(PROJECT_DETAILS_CACHE_KEY + projectId)

    // Update all projects cache
    const allProjectsCachedData = await AsyncStorage.getItem(PROJECTS_CACHE_KEY)

    if (allProjectsCachedData) {
      const { data, timestamp } = JSON.parse(allProjectsCachedData)
      const updatedData = data.filter((p: any) => p.id !== projectId)

      await AsyncStorage.setItem(
        PROJECTS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }
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
