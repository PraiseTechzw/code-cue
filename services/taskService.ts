import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { offlineStore } from "./offlineStore"

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type NewTask = Database["public"]["Tables"]["tasks"]["Insert"]
export type UpdateTask = Database["public"]["Tables"]["tasks"]["Update"]

export const taskService = {
  async getTasksByProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error
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
          assignee:profiles!assignee_id (
            id,
            username,
            full_name,
            avatar_url
          ),
          comments (
            id,
            text,
            user_id,
            created_at,
            profiles (
              username,
              full_name,
              avatar_url
            )
          ),
          subtasks (
            id,
            title,
            completed,
            created_at
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error fetching task:", error)
      // If offline, get from local storage
      return offlineStore.getTaskById(id)
    }
  },

  async createTask(task: NewTask) {
    try {
      const { data, error } = await supabase.from("tasks").insert(task).select().single()

      if (error) throw error

      // Update local storage
      offlineStore.addTask(data)

      return data
    } catch (error) {
      console.error("Error creating task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const tempId = `temp_${Date.now()}`
        const tempTask = {
          ...task,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Task

        offlineStore.addTask(tempTask)
        offlineStore.addOfflineChange({
          table_name: "tasks",
          record_id: tempId,
          operation: "INSERT",
          data: task,
        })

        return tempTask
      }

      throw error
    }
  },

  async updateTask(id: string, updates: UpdateTask) {
    try {
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single()

      if (error) throw error

      // Update local storage
      offlineStore.updateTask(data)

      return data
    } catch (error) {
      console.error("Error updating task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const task = await offlineStore.getTaskById(id)
        if (task) {
          const updatedTask = { ...task, ...updates, updated_at: new Date().toISOString() }

          offlineStore.updateTask(updatedTask)
          offlineStore.addOfflineChange({
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
      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) throw error

      // Update local storage
      offlineStore.deleteTask(id)

      return true
    } catch (error) {
      console.error("Error deleting task:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        offlineStore.deleteTask(id)
        offlineStore.addOfflineChange({
          table_name: "tasks",
          record_id: id,
          operation: "DELETE",
          data: { id },
        })

        return true
      }

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
