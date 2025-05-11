import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { notificationService } from "./notificationService"
import * as SecureStore from "expo-secure-store"
import NetInfo from "@react-native-community/netinfo"
import { offlineStore } from "./offlineStore"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type GithubRepository = Database["public"]["Tables"]["github_repositories"]["Row"]
export type GithubCommit = Database["public"]["Tables"]["github_commits"]["Row"]
export type GithubConnection = Database["public"]["Tables"]["github_connections"]["Row"]

// Cache keys
const CACHE_KEYS = {
  CONNECTION: "github_connection",
  REPOSITORIES: "github_repositories",
  COMMITS: "github_commits_",
  SELECTED_REPO: "github_selected_repo",
}

export const githubService = {
  async getConnection() {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        // Return cached connection if offline
        const cachedConnection = await offlineStore.getItem(CACHE_KEYS.CONNECTION)
        return cachedConnection
      }

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase.from("github_connections").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 is "no rows returned"

      // Cache the connection data
      if (data) {
        await offlineStore.setItem(CACHE_KEYS.CONNECTION, data)
      } else {
        await offlineStore.removeItem(CACHE_KEYS.CONNECTION)
      }

      return data || null
    } catch (error) {
      console.error("Error fetching GitHub connection:", error)

      // Try to get from cache if there's an error
      const cachedConnection = await offlineStore.getItem(CACHE_KEYS.CONNECTION)
      return cachedConnection
    }
  },

  async connectGitHub({ username, accessToken }: { username: string; accessToken: string }) {
    try {
      // Validate the token by making a test API call
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - Invalid token or insufficient permissions`)
      }

      const userData = await response.json()

      // Verify the username matches
      if (userData.login.toLowerCase() !== username.toLowerCase()) {
        throw new Error("The provided username does not match the token owner")
      }

      // Save the connection with verified data
      return await this.saveConnection(userData.login, accessToken)
    } catch (error) {
      console.error("Error connecting to GitHub:", error)
      throw error
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
          .update({
            username,
            access_token: accessToken,
            updated_at: new Date().toISOString(),
            // Add avatar URL and other user info from GitHub API
            avatar_url: await this.fetchUserAvatar(username, accessToken),
          })
          .eq("id", existingConnection.id)
          .select()
          .maybeSingle()

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
            avatar_url: await this.fetchUserAvatar(username, accessToken),
          })
          .select()
          .maybeSingle()

        if (error) throw error
        data = newData

        // Create notification for new connection
        await notificationService.createNotification({
          title: "GitHub Connected",
          description: `You connected your GitHub account: ${username}`,
          type: "github_connected"
        })
      }

      // Cache the connection data
      await offlineStore.setItem(CACHE_KEYS.CONNECTION, data)

      // Fetch and cache repositories after connecting
      await this.fetchAndCacheRepositories(accessToken, user.id)

      return data
    } catch (error) {
      console.error("Error saving GitHub connection:", error)
      throw error
    }
  },

  async fetchUserAvatar(username: string, accessToken: string) {
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const userData = await response.json()
      return userData.avatar_url || null
    } catch (error) {
      console.error("Error fetching user avatar:", error)
      return null
    }
  },

  async fetchAndCacheRepositories(accessToken: string, userId: string) {
    try {
      // Fetch repositories from GitHub API
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const repos = await response.json()

      // Save repositories to database
      for (const repo of repos) {
        const savedRepo = await this.saveRepository({
          repo_id: repo.id.toString(),
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url
        })
        // Only use savedRepo if not null (no notification or id usage here, but safe for future use)
      }

      // Fetch and cache the updated repositories
      const { data } = await supabase
        .from("github_repositories")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (data) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, data)
      }
    } catch (error) {
      console.error("Error fetching and caching repositories:", error)
    }
  },

  async disconnectGithub() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("github_connections").delete().eq("user_id", user.id)

      if (error) throw error

      // Clear cached data
      await offlineStore.removeItem(CACHE_KEYS.CONNECTION)
      await offlineStore.removeItem(CACHE_KEYS.REPOSITORIES)
      await SecureStore.deleteItemAsync("lastSelectedGitHubRepo")

      // Clear all commit caches
      const allKeys = await AsyncStorage.getAllKeys()
      const commitCacheKeys = allKeys.filter((key: string) => key.startsWith(CACHE_KEYS.COMMITS))
      for (const key of commitCacheKeys) {
        await offlineStore.removeItem(key)
      }

      return true
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      throw error
    }
  },

  async getRepositories() {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        // Return cached repositories if offline
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      }

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("github_repositories")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) throw error

      // Cache the repositories data
      if (data) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, data)
      }

      return data || []
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error)

      // Try to get from cache if there's an error
      const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
      return cachedRepos || []
    }
  },

  async getRepositoryById(id: string) {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        // Try to find in cached repositories if offline
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        if (cachedRepos) {
          const repo = cachedRepos.find((r: any) => r.id === id)
          if (repo) return repo
        }
      }

      const { data, error } = await supabase.from("github_repositories").select("*").eq("id", id).maybeSingle()

      if (error) throw error
      if (!data) return null
      return data
    } catch (error) {
      console.error("Error fetching GitHub repository:", error)

      // Try to find in cached repositories if there's an error
      const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
      if (cachedRepos) {
        const repo = cachedRepos.find((r: any) => r.id === id)
        if (repo) return repo
      }

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
          .maybeSingle()

        if (error) throw error
        data = updatedData

        if (data) {
          // Create notification for updated repository
          await notificationService.createNotification({
            title: "Repository Updated",
            description: `You updated the repository: ${repository.name}`,
            type: "repository_updated",
            related_id: data.id,
            related_type: "repository"
          })
        }
      } else {
        // Create new repository
        const { data: newData, error } = await supabase
          .from("github_repositories")
          .insert({
            ...repository,
            user_id: user.id,
          })
          .select()
          .maybeSingle()

        if (error) throw error
        data = newData

        if (data) {
          // Create notification for new repository
          await notificationService.createNotification({
            title: "Repository Added",
            description: `You added the repository: ${repository.name}`,
            type: "repository_added",
            related_id: data.id,
            related_type: "repository"
          })
        }
      }

      // Update cached repositories
      const cachedRepos = (await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)) || []
      let updatedRepos = cachedRepos
      if (data) {
        updatedRepos = existingRepo
          ? cachedRepos.map((r: any) => (r.id === existingRepo.id ? data : r))
          : [data, ...cachedRepos]
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, updatedRepos)
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

      // Update cached repositories
      const cachedRepos = (await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)) || []
      const updatedRepos = cachedRepos.map((r: any) => (r.id === repositoryId ? { ...r, project_id: projectId } : r))
      await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, updatedRepos)

      // Create notification for repository link
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        await notificationService.createNotification({
          title: "Repository Linked",
          description: `You linked repository ${data.name} to a project`,
          type: "repository_linked",
          related_id: data.id,
          related_type: "repository"
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
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        // Return cached commits if offline
        const cachedCommits = await offlineStore.getItem(`${CACHE_KEYS.COMMITS}${repositoryId}`)
        return cachedCommits || []
      }

      const { data, error } = await supabase
        .from("github_commits")
        .select("*")
        .eq("repository_id", repositoryId)
        .order("committed_at", { ascending: false })

      if (error) throw error

      // Cache the commits data
      if (data) {
        await offlineStore.setItem(`${CACHE_KEYS.COMMITS}${repositoryId}`, data)
      }

      return data || []
    } catch (error) {
      console.error("Error fetching GitHub commits:", error)

      // Try to get from cache if there's an error
      const cachedCommits = await offlineStore.getItem(`${CACHE_KEYS.COMMITS}${repositoryId}`)
      return cachedCommits || []
    }
  },

  async getCommitById(commitId: string) {
    try {
      const { data, error } = await supabase
        .from("github_commits")
        .select("*, repository:github_repositories(*)")
        .eq("id", commitId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching GitHub commit:", error)
      return null
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

      // Update cached commits
      const cachedCommits = (await offlineStore.getItem(`${CACHE_KEYS.COMMITS}${commit.repository_id}`)) || []
      await offlineStore.setItem(`${CACHE_KEYS.COMMITS}${commit.repository_id}`, [data, ...cachedCommits])

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
        .select("*, repository:github_repositories(*)")
        .single()

      if (error) throw error

      // Update cached commits
      if (data.repository_id) {
        const cachedCommits = (await offlineStore.getItem(`${CACHE_KEYS.COMMITS}${data.repository_id}`)) || []
        const updatedCommits = cachedCommits.map((c: any) => (c.id === commitId ? { ...c, task_id: taskId } : c))
        await offlineStore.setItem(`${CACHE_KEYS.COMMITS}${data.repository_id}`, updatedCommits)
      }

      // Create notification for commit link
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        await notificationService.createNotification({
          title: "Commit Linked",
          description: `You linked a commit to a task`,
          type: "commit_linked",
          related_id: data.id,
          related_type: "commit"
        })
      }

      return data
    } catch (error) {
      console.error("Error linking commit to task:", error)
      throw error
    }
  },

  async fetchCommitsForRepository(repositoryId: string) {
    try {
      // Get repository and connection details
      const repository = await this.getRepositoryById(repositoryId)
      const connection = await this.getConnection()

      if (!repository || !connection) {
        throw new Error("Repository or connection not found")
      }

      // Fetch commits from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repository.full_name}/commits`, {
        headers: {
          Authorization: `token ${connection.access_token}`,
        },
      })

      if (response.status === 409) {
        // Repo is empty (no commits on default branch)
        return []
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const commits = await response.json()

      // Save commits to database
      for (const commit of commits) {
        await this.saveCommit({
          repository_id: repositoryId,
          commit_id: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author.name,
          html_url: commit.html_url,
          committed_at: commit.commit.author.date
        })
      }

      // Return updated commits
      return this.getCommits(repositoryId)
    } catch (error) {
      console.error("Error fetching commits for repository:", error)
      throw error
    }
  },

  // Method to set the selected repository (used by the repositories screen)
  async setSelectedRepository(repoId: string) {
    try {
      await SecureStore.setItemAsync("lastSelectedGitHubRepo", repoId)
      return true
    } catch (error) {
      console.error("Error setting selected repository:", error)
      return false
    }
  },

  // Method to add a repository manually
  async addRepository(repoDetails: {
    name: string
    full_name: string
    html_url: string
    project_id?: string | null
  }) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      // Extract repo ID from the URL or generate one
      const repoId = Date.now().toString()

      // Save the repository
      const repo = await this.saveRepository({
        repo_id: repoId,
        name: repoDetails.name,
        full_name: repoDetails.full_name,
        html_url: repoDetails.html_url,
        project_id: repoDetails.project_id || null
      })

      return repo
    } catch (error) {
      console.error("Error adding repository:", error)
      throw error
    }
  },
}
