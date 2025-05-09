import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { offlineStore } from "./offlineStore"
import { notificationService } from "./notificationService"
import { projectService } from "./projectService"

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type NewTask = Database["public"]["Tables"]["tasks"]["Insert"]
export type UpdateTask = Database["public"]["Tables"]["tasks"]["Update"]
export type Subtask = Database["public"]["Tables"]["subtasks"]["Row"]
export type NewSubtask = Database["public"]["Tables"]["subtasks"]["Insert"]
export type Comment = Database["public"]["Tables"]["comments"]["Row"]
export type NewComment = Database["public"]["Tables"]["comments"]["Insert"]

export const taskService = {
  async getTasksByProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Cache tasks for offline use
      await offlineStore.cacheTasks(data || [])

      return data || []
    } catch (error) {
      console.error("Error fetching tasks:", error)
      // If offline, get from local storage
      return offlineStore.getTasksByProject(projectId)
    }
  },

  async getTaskById(id: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          subtasks(*),
          comments(*, profiles:user_id(full_name, avatar_url))
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      // Cache task for offline use
      if (data) {
        await offlineStore.addTask(data)
      }

      return data
    } catch (error) {
      console.error("Error fetching task:", error)
      // If offline, get from local storage
      return offlineStore.getTaskById(id)
    }
  },

  async createTask(task: Omit<NewTask, "user_id">) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const newTask: NewTask = {
        ...task,
        user_id: user.id,
      }

      const { data, error } = await supabase.from("tasks").insert(newTask).select().single()

      if (error) throw error

      // Create notification for new task
      await notificationService.createNotification({
        title: "Task Created",
        description: `You created a new task: ${task.title}`,
        type: "task_created",
        user_id: user.id,
        related_id: data.id,
        related_type: "task",
      })

      // Update project progress
      await projectService.calculateProjectProgress(task.project_id)

      // Update local storage
      await offlineStore.addTask(data)

      return data
    } catch (error) {
      console.error("Error creating task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) throw new Error("User not authenticated")

        const tempId = `temp_${Date.now()}`
        const tempTask = {
          ...task,
          user_id: user.id,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: task.status || "todo",
          priority: task.priority || "Medium",
        } as Task

        await offlineStore.addTask(tempTask)
        await offlineStore.addOfflineChange({
          table_name: "tasks",
          record_id: tempId,
          operation: "INSERT",
          data: {
            ...task,
            user_id: user.id,
          },
        })

        return tempTask
      }

      throw error
    }
  },

  async updateTask(id: string, updates: UpdateTask) {
    try {
      const { data: oldTask } = await supabase.from("tasks").select("status, project_id").eq("id", id).single()

      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single()

      if (error) throw error

      // If status changed to done, create notification
      if (updates.status === "done" && oldTask && oldTask.status !== "done") {
        const user = (await supabase.auth.getUser()).data.user
        if (user) {
          await notificationService.createNotification({
            title: "Task Completed",
            description: `You completed the task: ${data.title}`,
            type: "task_completed",
            user_id: user.id,
            related_id: data.id,
            related_type: "task",
          })
        }
      }

      // Update project progress if status changed
      if (updates.status && oldTask && updates.status !== oldTask.status) {
        await projectService.calculateProjectProgress(data.project_id)
      }

      // Update local storage
      await offlineStore.updateTask(data)

      return data
    } catch (error) {
      console.error("Error updating task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const task = await offlineStore.getTaskById(id)
        if (task) {
          const updatedTask = { ...task, ...updates, updated_at: new Date().toISOString() }

          await offlineStore.updateTask(updatedTask)
          await offlineStore.addOfflineChange({
            table_name: "tasks",
            record_id: id,
            operation: "UPDATE",
            data: updates,
          })

          return updatedTask
        }
      }

      throw error
    }
  },

  async deleteTask(id: string) {
    try {
      // Get task info before deleting
      const { data: task } = await supabase.from("tasks").select("project_id").eq("id", id).single()

      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) throw error

      // Update project progress
      if (task) {
        await projectService.calculateProjectProgress(task.project_id)
      }

      // Update local storage
      await offlineStore.deleteTask(id)

      return true
    } catch (error) {
      console.error("Error deleting task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const task = await offlineStore.getTaskById(id)
        await offlineStore.deleteTask(id)

        if (task) {
          await offlineStore.addOfflineChange({
            table_name: "tasks",
            record_id: id,
            operation: "DELETE",
            data: { id, project_id: task.project_id },
          })
        }

        return true
      }

      throw error
    }
  },

  async createSubtask(subtask: NewSubtask) {
    try {
      const { data, error } = await supabase.from("subtasks").insert(subtask).select().single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error creating subtask:", error)
      throw error
    }
  },

  async updateSubtask(id: string, completed: boolean) {
    try {
      const { data, error } = await supabase.from("subtasks").update({ completed }).eq("id", id).select().single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error updating subtask:", error)
      throw error
    }
  },

  async deleteSubtask(id: string) {
    try {
      const { error } = await supabase.from("subtasks").delete().eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error deleting subtask:", error)
      throw error
    }
  },

  async createComment(comment: Omit<NewComment, "user_id">) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const newComment: NewComment = {
        ...comment,
        user_id: user.id,
      }

      const { data, error } = await supabase.from("comments").insert(newComment).select().single()

      if (error) throw error

      // Get task info
      const { data: task } = await supabase.from("tasks").select("title").eq("id", comment.task_id).single()

      // Create notification for new comment
      if (task) {
        await notificationService.createNotification({
          title: "New Comment",
          description: `You commented on task: ${task.title}`,
          type: "comment_added",
          user_id: user.id,
          related_id: data.id,
          related_type: "comment",
        })
      }

      return data
    } catch (error) {
      console.error("Error creating comment:", error)
      throw error
    }
  },

  async deleteComment(id: string) {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error deleting comment:", error)
      throw error
    }
  },

  async isOnline() {
    try {
      const { data } = await supabase.from("tasks").select("id").limit(1)
      return !!data
    } catch (error) {
      return false
    }
  },
}
