import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { notificationService } from "./notificationService"

export type GithubRepository = Database["public"]["Tables"]["github_repositories"]["Row"]
export type GithubCommit = Database["public"]["Tables"]["github_commits"]["Row"]
export type GithubConnection = Database["public"]["Tables"]["github_connections"]["Row"]

export const githubService = {
  async getConnection() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase.from("github_connections").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 is "no rows returned"

      return data || null
    } catch (error) {
      console.error("Error fetching GitHub connection:", error)
      return null
    }
  },

  async saveConnection(username: string, accessToken: string) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from("github_connections")
        .select("id")
        .eq("user_id", user.id)
        .single()

      let data
      if (existingConnection) {
        // Update existing connection
        const { data: updatedData, error } = await supabase
          .from("github_connections")
          .update({ username, access_token: accessToken, updated_at: new Date().toISOString() })
          .eq("id", existingConnection.id)
          .select()
          .single()

        if (error) throw error
        data = updatedData
      } else {
        // Create new connection
        const { data: newData, error } = await supabase
          .from("github_connections")
          .insert({
            user_id: user.id,
            username,
            access_token: accessToken,
          })
          .select()
          .single()

        if (error) throw error
        data = newData

        // Create notification for new connection
        await notificationService.createNotification({
          title: "GitHub Connected",
          description: `You connected your GitHub account: ${username}`,
          type: "github_connected",
          user_id: user.id,
        })
      }

      return data
    } catch (error) {
      console.error("Error saving GitHub connection:", error)
      throw error
    }
  },

  async disconnectGithub() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("github_connections").delete().eq("user_id", user.id)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      throw error
    }
  },

  async getRepositories() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("github_repositories")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error)
      return []
    }
  },

  async getRepositoryById(id: string) {
    try {
      const { data, error } = await supabase.from("github_repositories").select("*").eq("id", id).single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching GitHub repository:", error)
      return null
    }
  },

  async saveRepository(repository: Omit<Database["public"]["Tables"]["github_repositories"]["Insert"], "user_id">) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      // Check if repository already exists
      const { data: existingRepo } = await supabase
        .from("github_repositories")
        .select("id")
        .eq("user_id", user.id)
        .eq("repo_id", repository.repo_id)
        .single()

      let data
      if (existingRepo) {
        // Update existing repository
        const { data: updatedData, error } = await supabase
          .from("github_repositories")
          .update({ ...repository, updated_at: new Date().toISOString() })
          .eq("id", existingRepo.id)
          .select()
          .single()

        if (error) throw error
        data = updatedData
      } else {
        // Create new repository
        const { data: newData, error } = await supabase
          .from("github_repositories")
          .insert({
            ...repository,
            user_id: user.id,
          })
          .select()
          .single()

        if (error) throw error
        data = newData
      }

      return data
    } catch (error) {
      console.error("Error saving GitHub repository:", error)
      throw error
    }
  },

  async linkRepositoryToProject(repositoryId: string, projectId: string) {
    try {
      const { data, error } = await supabase
        .from("github_repositories")
        .update({ project_id: projectId })
        .eq("id", repositoryId)
        .select()
        .single()

      if (error) throw error

      // Create notification for repository link
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        await notificationService.createNotification({
          title: "Repository Linked",
          description: `You linked repository ${data.name} to a project`,
          type: "repository_linked",
          user_id: user.id,
          related_id: data.id,
          related_type: "repository",
        })
      }

      return data
    } catch (error) {
      console.error("Error linking repository to project:", error)
      throw error
    }
  },

  async getCommits(repositoryId: string) {
    try {
      const { data, error } = await supabase
        .from("github_commits")
        .select("*")
        .eq("repository_id", repositoryId)
        .order("committed_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching GitHub commits:", error)
      return []
    }
  },

  async saveCommit(commit: Database["public"]["Tables"]["github_commits"]["Insert"]) {
    try {
      // Check if commit already exists
      const { data: existingCommit } = await supabase
        .from("github_commits")
        .select("id")
        .eq("repository_id", commit.repository_id)
        .eq("commit_id", commit.commit_id)
        .single()

      if (existingCommit) {
        // Commit already exists, no need to save
        return existingCommit
      }

      // Create new commit
      const { data, error } = await supabase.from("github_commits").insert(commit).select().single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error saving GitHub commit:", error)
      throw error
    }
  },

  async linkCommitToTask(commitId: string, taskId: string) {
    try {
      const { data, error } = await supabase
        .from("github_commits")
        .update({ task_id: taskId })
        .eq("id", commitId)
        .select()
        .single()

      if (error) throw error

      // Create notification for commit link
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        await notificationService.createNotification({
          title: "Commit Linked",
          description: `You linked a commit to a task`,
          type: "commit_linked",
          user_id: user.id,
          related_id: data.id,
          related_type: "commit",
        })
      }

      return data
    } catch (error) {
      console.error("Error linking commit to task:", error)
      throw error
    }
  },
}
