import { supabase } from "@/lib/supabase"
import { offlineStore } from "./offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Database } from "@/types/supabase"

// UUID v4 generator that doesn't rely on crypto
const generateUUID = () => {
  const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return pattern.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type NewTask = Database["public"]["Tables"]["tasks"]["Insert"]
export type UpdateTask = Database["public"]["Tables"]["tasks"]["Update"]
export type Subtask = Database["public"]["Tables"]["subtasks"]["Row"]
export type NewSubtask = Database["public"]["Tables"]["subtasks"]["Insert"]
export type Comment = Database["public"]["Tables"]["comments"]["Row"]
export type NewComment = Database["public"]["Tables"]["comments"]["Insert"]

// Cache keys
const TASKS_CACHE_KEY = "tasks_cache"
const TASK_DETAILS_CACHE_KEY = "task_details_cache_"
const PROJECT_TASKS_CACHE_KEY = "project_tasks_cache_"

// Check if device is online
export const isOnline = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch()
  return netInfo.isConnected === true
}

// Get all tasks with optional filters
export const getTasks = async (filters?: { status?: string[]; projectId?: string }): Promise<any[]> => {
  try {
    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = TASKS_CACHE_KEY + (filters ? JSON.stringify(filters) : "")
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

    // Build query
    let query = supabase.from("tasks").select(`
      *,
      user:profiles!user_id(*),
      project:projects(*),
      subtasks:subtasks(*),
      comments:comments(*)
    `)

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status)
      }

      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId)
      }
    }

    // Execute query
    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )

    return data || []
  } catch (error) {
    console.error("Error getting tasks:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = TASKS_CACHE_KEY + (filters ? JSON.stringify(filters) : "")
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached tasks:", cacheError)
    }

    return []
  }
}

// Get tasks by project
export const getTasksByProject = async (projectId: string): Promise<any[]> => {
  try {
    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = PROJECT_TASKS_CACHE_KEY + projectId
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

    // Get tasks for project
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        subtasks:subtasks(*),
        comments:comments(*)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )

    return data || []
  } catch (error) {
    console.error("Error getting tasks by project:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = PROJECT_TASKS_CACHE_KEY + projectId
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached tasks by project:", cacheError)
    }

    return []
  }
}

// Get task by ID
export const getTaskById = async (taskId: string): Promise<any> => {
  try {
    const online = await isOnline()

    // Try to get from cache first
    const cacheKey = TASK_DETAILS_CACHE_KEY + taskId
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
      // If offline, return null
      return null
    }

    // Get task details
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects(*),
        subtasks:subtasks(*),
        comments:comments(*)
      `)
      .eq("id", taskId)
      .single()

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
    console.error("Error getting task by ID:", error)

    // Try to get from cache as fallback
    try {
      const cacheKey = TASK_DETAILS_CACHE_KEY + taskId
      const cachedData = await AsyncStorage.getItem(cacheKey)

      if (cachedData) {
        const { data } = JSON.parse(cachedData)
        return data
      }
    } catch (cacheError) {
      console.error("Error getting cached task details:", cacheError)
    }

    return null
  }
}

// Create a new task
export const createTask = async (taskData: any): Promise<any> => {
  try {
    const online = await isOnline()
    const taskId = generateUUID()
    const now = new Date().toISOString()

    // Prepare task data
    const newTask = {
      id: taskId,
      ...taskData,
      created_at: now,
      updated_at: now,
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "tasks",
        record_id: taskId,
        operation: "INSERT",
        data: newTask,
      })

      // Update local cache
      await updateTasksCache(newTask)

      return newTask
    }

    // If online, create task
    const { data, error } = await supabase.from("tasks").insert(newTask).select().single()

    if (error) throw error

    // Update cache
    await updateTasksCache(data)

    return data
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

// Update a task
export const updateTask = async (taskId: string, updates: any): Promise<any> => {
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
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "tasks",
        record_id: taskId,
        operation: "UPDATE",
        data: updateData,
      })

      // Update local cache
      await updateTaskCache(taskId, updateData)

      return { id: taskId, ...updateData }
    }

    // If online, update task
    const { data, error } = await supabase.from("tasks").update(updateData).eq("id", taskId).select().single()

    if (error) throw error

    // Update cache
    await updateTaskCache(taskId, data)

    return data
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

// Delete a task
export const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "tasks",
        record_id: taskId,
        operation: "DELETE",
        data: null,
      })

      // Update local cache
      await removeTaskFromCache(taskId)

      return true
    }

    // If online, delete task
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)

    if (error) throw error

    // Update cache
    await removeTaskFromCache(taskId)

    return true
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Create a subtask
export const createSubtask = async (subtaskData: any): Promise<any> => {
  try {
    const online = await isOnline()
    const subtaskId = generateUUID()
    const now = new Date().toISOString()

    // Prepare subtask data
    const newSubtask = {
      id: subtaskId,
      ...subtaskData,
      created_at: now,
      updated_at: now,
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "subtasks",
        record_id: subtaskId,
        operation: "INSERT",
        data: newSubtask,
      })

      // Update local cache
      await updateSubtaskInTaskCache(subtaskData.task_id, newSubtask)

      return newSubtask
    }

    // If online, create subtask
    const { data, error } = await supabase.from("subtasks").insert(newSubtask).select().single()

    if (error) throw error

    // Update cache
    await updateSubtaskInTaskCache(subtaskData.task_id, data)

    return data
  } catch (error) {
    console.error("Error creating subtask:", error)
    throw error
  }
}

// Update a subtask
export const updateSubtask = async (subtaskId: string, completed: boolean): Promise<any> => {
  try {
    const online = await isOnline()
    const now = new Date().toISOString()

    // Get subtask to get task_id
    const subtask = await getSubtaskById(subtaskId)

    if (!subtask) {
      throw new Error("Subtask not found")
    }

    // Prepare update data
    const updateData = {
      completed,
      updated_at: now,
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "subtasks",
        record_id: subtaskId,
        operation: "UPDATE",
        data: updateData,
      })

      // Update local cache
      await updateSubtaskInTaskCache(subtask.task_id, { ...subtask, ...updateData })

      return { ...subtask, ...updateData }
    }

    // If online, update subtask
    const { data, error } = await supabase.from("subtasks").update(updateData).eq("id", subtaskId).select().single()

    if (error) throw error

    // Update cache
    await updateSubtaskInTaskCache(subtask.task_id, data)

    return data
  } catch (error) {
    console.error("Error updating subtask:", error)
    throw error
  }
}

// Get subtask by ID
export const getSubtaskById = async (subtaskId: string): Promise<any> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, try to find in task cache
      const tasks = await getAllTasksFromCache()

      for (const task of tasks) {
        if (task.subtasks) {
          const subtask = task.subtasks.find((s: any) => s.id === subtaskId)
          if (subtask) {
            return subtask
          }
        }
      }

      return null
    }

    // If online, get subtask
    const { data, error } = await supabase.from("subtasks").select("*").eq("id", subtaskId).single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error getting subtask by ID:", error)
    return null
  }
}

// Create a comment
export const createComment = async (commentData: any): Promise<any> => {
  try {
    const online = await isOnline()
    const commentId = generateUUID()
    const now = new Date().toISOString()

    // Prepare comment data
    const newComment = {
      id: commentId,
      ...commentData,
      created_at: now,
      updated_at: now,
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: generateUUID(),
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0,
        table_name: "comments",
        record_id: commentId,
        operation: "INSERT",
        data: newComment,
      })

      // Update local cache
      await updateCommentInTaskCache(commentData.task_id, newComment)

      return newComment
    }

    // If online, create comment
    const { data, error } = await supabase.from("comments").insert(newComment).select().single()

    if (error) throw error

    // Update cache
    await updateCommentInTaskCache(commentData.task_id, data)

    return data
  } catch (error) {
    console.error("Error creating comment:", error)
    throw error
  }
}

// Helper: Update tasks cache with a new task
const updateTasksCache = async (newTask: any) => {
  try {
    // Update all tasks cache
    const cachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)

    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = [newTask, ...data]

      await AsyncStorage.setItem(
        TASKS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Update project tasks cache
    if (newTask.project_id) {
      const projectCacheKey = PROJECT_TASKS_CACHE_KEY + newTask.project_id
      const projectCachedData = await AsyncStorage.getItem(projectCacheKey)

      if (projectCachedData) {
        const { data, timestamp } = JSON.parse(projectCachedData)
        const updatedData = [newTask, ...data]

        await AsyncStorage.setItem(
          projectCacheKey,
          JSON.stringify({
            data: updatedData,
            timestamp,
          }),
        )
      }
    }
  } catch (error) {
    console.error("Error updating tasks cache:", error)
  }
}

// Helper: Update task cache with updates
const updateTaskCache = async (taskId: string, updates: any) => {
  try {
    // Update task details cache
    const taskCacheKey = TASK_DETAILS_CACHE_KEY + taskId
    const taskCachedData = await AsyncStorage.getItem(taskCacheKey)

    if (taskCachedData) {
      const { data, timestamp } = JSON.parse(taskCachedData)
      const updatedData = { ...data, ...updates }

      await AsyncStorage.setItem(
        taskCacheKey,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Update all tasks cache
    const allTasksCachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)

    if (allTasksCachedData) {
      const { data, timestamp } = JSON.parse(allTasksCachedData)
      const updatedData = data.map((task: any) => (task.id === taskId ? { ...task, ...updates } : task))

      await AsyncStorage.setItem(
        TASKS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Update project tasks cache
    const task = await getTaskById(taskId)

    if (task && task.project_id) {
      const projectCacheKey = PROJECT_TASKS_CACHE_KEY + task.project_id
      const projectCachedData = await AsyncStorage.getItem(projectCacheKey)

      if (projectCachedData) {
        const { data, timestamp } = JSON.parse(projectCachedData)
        const updatedData = data.map((t: any) => (t.id === taskId ? { ...t, ...updates } : t))

        await AsyncStorage.setItem(
          projectCacheKey,
          JSON.stringify({
            data: updatedData,
            timestamp,
          }),
        )
      }
    }
  } catch (error) {
    console.error("Error updating task cache:", error)
  }
}

// Helper: Remove task from cache
const removeTaskFromCache = async (taskId: string) => {
  try {
    // Get task to get project_id
    const task = await getTaskById(taskId)

    // Remove task details cache
    await AsyncStorage.removeItem(TASK_DETAILS_CACHE_KEY + taskId)

    // Update all tasks cache
    const allTasksCachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)

    if (allTasksCachedData) {
      const { data, timestamp } = JSON.parse(allTasksCachedData)
      const updatedData = data.filter((t: any) => t.id !== taskId)

      await AsyncStorage.setItem(
        TASKS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }

    // Update project tasks cache
    if (task && task.project_id) {
      const projectCacheKey = PROJECT_TASKS_CACHE_KEY + task.project_id
      const projectCachedData = await AsyncStorage.getItem(projectCacheKey)

      if (projectCachedData) {
        const { data, timestamp } = JSON.parse(projectCachedData)
        const updatedData = data.filter((t: any) => t.id !== taskId)

        await AsyncStorage.setItem(
          projectCacheKey,
          JSON.stringify({
            data: updatedData,
            timestamp,
          }),
        )
      }
    }
  } catch (error) {
    console.error("Error removing task from cache:", error)
  }
}

// Helper: Update subtask in task cache
const updateSubtaskInTaskCache = async (taskId: string, subtask: any) => {
  try {
    // Update task details cache
    const taskCacheKey = TASK_DETAILS_CACHE_KEY + taskId
    const taskCachedData = await AsyncStorage.getItem(taskCacheKey)

    if (taskCachedData) {
      const { data, timestamp } = JSON.parse(taskCachedData)

      let updatedSubtasks = []

      if (data.subtasks) {
        // Check if subtask already exists
        const existingIndex = data.subtasks.findIndex((s: any) => s.id === subtask.id)

        if (existingIndex >= 0) {
          // Update existing subtask
          updatedSubtasks = data.subtasks.map((s: any) => (s.id === subtask.id ? subtask : s))
        } else {
          // Add new subtask
          updatedSubtasks = [...data.subtasks, subtask]
        }
      } else {
        // No subtasks yet
        updatedSubtasks = [subtask]
      }

      const updatedData = {
        ...data,
        subtasks: updatedSubtasks,
      }

      await AsyncStorage.setItem(
        taskCacheKey,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }
  } catch (error) {
    console.error("Error updating subtask in task cache:", error)
  }
}

// Helper: Update comment in task cache
const updateCommentInTaskCache = async (taskId: string, comment: any) => {
  try {
    // Update task details cache
    const taskCacheKey = TASK_DETAILS_CACHE_KEY + taskId
    const taskCachedData = await AsyncStorage.getItem(taskCacheKey)

    if (taskCachedData) {
      const { data, timestamp } = JSON.parse(taskCachedData)

      let updatedComments = []

      if (data.comments) {
        // Check if comment already exists
        const existingIndex = data.comments.findIndex((c: any) => c.id === comment.id)

        if (existingIndex >= 0) {
          // Update existing comment
          updatedComments = data.comments.map((c: any) => (c.id === comment.id ? comment : c))
        } else {
          // Add new comment
          updatedComments = [...data.comments, comment]
        }
      } else {
        // No comments yet
        updatedComments = [comment]
      }

      const updatedData = {
        ...data,
        comments: updatedComments,
      }

      await AsyncStorage.setItem(
        taskCacheKey,
        JSON.stringify({
          data: updatedData,
          timestamp,
        }),
      )
    }
  } catch (error) {
    console.error("Error updating comment in task cache:", error)
  }
}

// Helper: Get all tasks from cache
const getAllTasksFromCache = async (): Promise<any[]> => {
  try {
    const cachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)

    if (cachedData) {
      const { data } = JSON.parse(cachedData)
      return data
    }

    return []
  } catch (error) {
    console.error("Error getting all tasks from cache:", error)
    return []
  }
}

// Export the taskService object
export const taskService = {
  isOnline,
  getTasks,
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  getSubtaskById,
  createComment,
  deleteComment: async (id: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error deleting comment:", error)
      throw error
    }
  },
  isOnlineOld: async () => {
    try {
      const { data } = await supabase.from("tasks").select("id").limit(1)
      return !!data
    } catch (error) {
      return false
    }
  },
}
