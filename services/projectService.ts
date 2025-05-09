import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { offlineStore } from "./offlineStore"
import { notificationService } from "./notificationService"

export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type NewProject = Database["public"]["Tables"]["projects"]["Insert"]
export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"]

export const projectService = {
  async getProjects() {
    try {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false })

      if (error) throw error

      // Cache projects for offline use
      await offlineStore.cacheProjects(data || [])

      return data || []
    } catch (error) {
      console.error("Error fetching projects:", error)
      // If offline, get from local storage
      return offlineStore.getProjects()
    }
  },

  async getProjectById(id: string) {
    try {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single()

      if (error) throw error

      // Cache project for offline use
      if (data) {
        await offlineStore.addProject(data)
      }

      return data
    } catch (error) {
      console.error("Error fetching project:", error)
      // If offline, get from local storage
      return offlineStore.getProjectById(id)
    }
  },

  async createProject(project: Omit<NewProject, "user_id">) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const newProject: NewProject = {
        ...project,
        user_id: user.id,
      }

      const { data, error } = await supabase.from("projects").insert(newProject).select().single()

      if (error) throw error

      // Create notification for new project
      await notificationService.createNotification({
        title: "Project Created",
        description: `You created a new project: ${project.name}`,
        type: "project_created",
        user_id: user.id,
        related_id: data.id,
        related_type: "project",
      })

      // Update local storage
      await offlineStore.addProject(data)

      return data
    } catch (error) {
      console.error("Error creating project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) throw new Error("User not authenticated")

        const tempId = `temp_${Date.now()}`
        const tempProject = {
          ...project,
          user_id: user.id,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress: project.progress || 0,
        } as Project

        await offlineStore.addProject(tempProject)
        await offlineStore.addOfflineChange({
          table_name: "projects",
          record_id: tempId,
          operation: "INSERT",
          data: {
            ...project,
            user_id: user.id,
          },
        })

        return tempProject
      }

      throw error
    }
  },

  async updateProject(id: string, updates: UpdateProject) {
    try {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single()

      if (error) throw error

      // Update local storage
      await offlineStore.updateProject(data)

      return data
    } catch (error) {
      console.error("Error updating project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const project = await offlineStore.getProjectById(id)
        if (project) {
          const updatedProject = { ...project, ...updates, updated_at: new Date().toISOString() }

          await offlineStore.updateProject(updatedProject)
          await offlineStore.addOfflineChange({
            table_name: "projects",
            record_id: id,
            operation: "UPDATE",
            data: updates,
          })

          return updatedProject
        }
      }

      throw error
    }
  },

  async deleteProject(id: string) {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)

      if (error) throw error

      // Update local storage
      await offlineStore.deleteProject(id)

      return true
    } catch (error) {
      console.error("Error deleting project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        await offlineStore.deleteProject(id)
        await offlineStore.addOfflineChange({
          table_name: "projects",
          record_id: id,
          operation: "DELETE",
          data: { id },
        })

        return true
      }

      throw error
    }
  },

  async calculateProjectProgress(projectId: string) {
    try {
      // Get all tasks for the project
      const { data: tasks, error } = await supabase.from("tasks").select("status").eq("project_id", projectId)

      if (error) throw error

      if (!tasks || tasks.length === 0) {
        // No tasks, set progress to 0
        await this.updateProject(projectId, { progress: 0 })
        return 0
      }

      // Calculate progress
      const completedTasks = tasks.filter((task) => task.status === "done").length
      const progress = Math.round((completedTasks / tasks.length) * 100)

      // Update project progress
      await this.updateProject(projectId, { progress })

      return progress
    } catch (error) {
      console.error("Error calculating project progress:", error)
      return null
    }
  },

  async isOnline() {
    try {
      const { data } = await supabase.from("projects").select("id").limit(1)
      return !!data
    } catch (error) {
      return false
    }
  },
}
