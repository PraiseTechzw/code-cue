import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { offlineStore } from "./offlineStore"

export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type NewProject = Database["public"]["Tables"]["projects"]["Insert"]
export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"]

export const projectService = {
  async getProjects() {
    try {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false })

      if (error) throw error
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
      return data
    } catch (error) {
      console.error("Error fetching project:", error)
      // If offline, get from local storage
      return offlineStore.getProjectById(id)
    }
  },

  async createProject(project: NewProject) {
    try {
      const { data, error } = await supabase.from("projects").insert(project).select().single()

      if (error) throw error

      // Update local storage
      offlineStore.addProject(data)

      return data
    } catch (error) {
      console.error("Error creating project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const tempId = `temp_${Date.now()}`
        const tempProject = {
          ...project,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Project

        offlineStore.addProject(tempProject)
        offlineStore.addOfflineChange({
          table_name: "projects",
          record_id: tempId,
          operation: "INSERT",
          data: project,
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
      offlineStore.updateProject(data)

      return data
    } catch (error) {
      console.error("Error updating project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        const project = await offlineStore.getProjectById(id)
        if (project) {
          const updatedProject = { ...project, ...updates, updated_at: new Date().toISOString() }

          offlineStore.updateProject(updatedProject)
          offlineStore.addOfflineChange({
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
      offlineStore.deleteProject(id)

      return true
    } catch (error) {
      console.error("Error deleting project:", error)

      // If offline, store locally and sync later
      if (!(await this.isOnline())) {
        offlineStore.deleteProject(id)
        offlineStore.addOfflineChange({
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

  async isOnline() {
    try {
      const { data } = await supabase.from("projects").select("id").limit(1)
      return !!data
    } catch (error) {
      return false
    }
  },
}
