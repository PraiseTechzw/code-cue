import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import { offlineStore } from "./offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Task, Subtask, Comment } from "@/types/appwrite"
import { ID, Query } from 'appwrite'

export type { Task, Subtask, Comment }
export type NewTask = Omit<Task, '$id' | '$createdAt' | '$updatedAt'>
export type UpdateTask = Partial<NewTask>
export type NewSubtask = Omit<Subtask, '$id' | '$createdAt' | '$updatedAt'>
export type NewComment = Omit<Comment, '$id' | '$createdAt'>

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
export const getTasks = async (filters?: { status?: string[]; projectId?: string }): Promise<Task[]> => {
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

    // Get current user
    const user = await account.get()

    // Build query filters
    const queryFilters = [Query.equal('user_id', user.$id)]
    
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        queryFilters.push(Query.equal('status', filters.status[0])) // Appwrite doesn't support 'in' with arrays easily
      }

      if (filters.projectId) {
        queryFilters.push(Query.equal('project_id', filters.projectId))
      }
    }

    // Execute query
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      [
        ...queryFilters,
        Query.orderDesc('$createdAt')
      ]
    )

    const tasks = documents as unknown as Task[]

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: tasks,
        timestamp: Date.now(),
      }),
    )

    return tasks || []
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
export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  try {
    // Validate projectId
    if (!projectId || projectId.trim() === '') {
      console.warn('getTasksByProject: projectId is empty or invalid')
      return []
    }

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
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      [
        Query.equal('project_id', projectId),
        Query.orderDesc('$createdAt')
      ]
    )

    const tasks = documents as unknown as Task[]

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: tasks,
        timestamp: Date.now(),
      }),
    )

    return tasks || []
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
export const getTaskById = async (taskId: string): Promise<Task | null> => {
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
      // If offline and no cache, return null
      return null
    }

    // Get task details
    const task = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId
    ) as unknown as Task

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: task,
        timestamp: Date.now(),
      }),
    )

    return task
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
export const createTask = async (taskData: NewTask): Promise<Task> => {
  try {
    const online = await isOnline()

    // Get current user
    const user = await account.get()

    const newTask = {
      ...taskData,
      user_id: user.$id
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTIONS.TASKS,
        record_id: ID.unique(),
        operation: "INSERT",
        data: newTask,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateTasksCache(newTask as Task)

      return newTask as Task
    }

    // If online, create task
    const createdTask = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      ID.unique(),
      newTask
    ) as unknown as Task

    // Update cache
    await updateTasksCache(createdTask)

    return createdTask
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

// Update a task
export const updateTask = async (taskId: string, updates: UpdateTask): Promise<Task> => {
  try {
    const online = await isOnline()

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTIONS.TASKS,
        record_id: taskId,
        operation: "UPDATE",
        data: updates,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await updateTaskCache(taskId, updates)

      return { $id: taskId, ...updates } as Task
    }

    // If online, update task
    const updatedTask = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      updates
    ) as unknown as Task

    // Update cache
    await updateTaskCache(taskId, updatedTask)

    return updatedTask
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
        id: ID.unique(),
        table_name: COLLECTIONS.TASKS,
        record_id: taskId,
        operation: "DELETE",
        data: null,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      // Update local cache
      await removeTaskFromCache(taskId)

      return true
    }

    // If online, delete task
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId
    )

    // Update cache
    await removeTaskFromCache(taskId)

    return true
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Create a subtask
export const createSubtask = async (subtaskData: NewSubtask): Promise<Subtask> => {
  try {
    const online = await isOnline()

    const newSubtask = {
      ...subtaskData,
      completed: subtaskData.completed || false
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTIONS.SUBTASKS,
        record_id: ID.unique(),
        operation: "INSERT",
        data: newSubtask,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      return newSubtask as Subtask
    }

    // If online, create subtask
    const createdSubtask = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SUBTASKS,
      ID.unique(),
      newSubtask
    ) as unknown as Subtask

    return createdSubtask
  } catch (error) {
    console.error("Error creating subtask:", error)
    throw error
  }
}

// Update a subtask
export const updateSubtask = async (subtaskId: string, completed: boolean): Promise<Subtask> => {
  try {
    const online = await isOnline()

    const updateData = { completed }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTIONS.SUBTASKS,
        record_id: subtaskId,
        operation: "UPDATE",
        data: updateData,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      return { $id: subtaskId, completed } as Subtask
    }

    // If online, update subtask
    const updatedSubtask = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBTASKS,
      subtaskId,
      updateData
    ) as unknown as Subtask

    return updatedSubtask
  } catch (error) {
    console.error("Error updating subtask:", error)
    throw error
  }
}

// Get subtask by ID
export const getSubtaskById = async (subtaskId: string): Promise<Subtask | null> => {
  try {
    const subtask = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.SUBTASKS,
      subtaskId
    ) as unknown as Subtask

    return subtask
  } catch (error) {
    console.error("Error getting subtask by ID:", error)
    return null
  }
}

// Create a comment
export const createComment = async (commentData: NewComment): Promise<Comment> => {
  try {
    const online = await isOnline()

    // Get current user
    const user = await account.get()

    const newComment = {
      ...commentData,
      user_id: user.$id
    }

    if (!online) {
      // If offline, queue for later
      await offlineStore.addOfflineChange({
        id: ID.unique(),
        table_name: COLLECTIONS.COMMENTS,
        record_id: ID.unique(),
        operation: "INSERT",
        data: newComment,
        created_at: new Date().toISOString(),
        synced: false,
        retry_count: 0
      })

      return newComment as Comment
    }

    // If online, create comment
    const createdComment = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.COMMENTS,
      ID.unique(),
      newComment
    ) as unknown as Comment

    return createdComment
  } catch (error) {
    console.error("Error creating comment:", error)
    throw error
  }
}

// Helper functions for cache management
const updateTasksCache = async (newTask: Task) => {
  try {
    const cachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = [newTask, ...data.filter((t: Task) => t.$id !== newTask.$id)]
      await AsyncStorage.setItem(
        TASKS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp: Date.now(),
        })
      )
    }
  } catch (error) {
    console.error("Error updating tasks cache:", error)
  }
}

const updateTaskCache = async (taskId: string, updates: any) => {
  try {
    const cacheKey = TASK_DETAILS_CACHE_KEY + taskId
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
    console.error("Error updating task cache:", error)
  }
}

const removeTaskFromCache = async (taskId: string) => {
  try {
    // Remove from tasks list cache
    const cachedData = await AsyncStorage.getItem(TASKS_CACHE_KEY)
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData)
      const updatedData = data.filter((t: Task) => t.$id !== taskId)
      await AsyncStorage.setItem(
        TASKS_CACHE_KEY,
        JSON.stringify({
          data: updatedData,
          timestamp: Date.now(),
        })
      )
    }

    // Remove task details cache
    const cacheKey = TASK_DETAILS_CACHE_KEY + taskId
    await AsyncStorage.removeItem(cacheKey)
  } catch (error) {
    console.error("Error removing task from cache:", error)
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
}
