import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import type { GithubRepository, GithubCommit, GithubConnection } from "@/types/appwrite"
import { notificationService } from "./notificationService"
import * as SecureStore from "expo-secure-store"
import NetInfo from "@react-native-community/netinfo"
import { offlineStore } from "./offlineStore"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ID, Query } from 'appwrite'

export type { GithubRepository, GithubCommit, GithubConnection }

// Cache keys
const CACHE_KEYS = {
  REPOSITORIES: 'github_repositories_cache',
  COMMITS: 'github_commits_cache',
  CONNECTION: 'github_connection_cache'
}

export const githubService = {
  // Connect GitHub account
  async connectGitHub(accessTokenOrParams: string | { accessToken: string; username: string }, username?: string) {
    try {
      let accessToken: string
      let usernameValue: string

      // Handle both parameter formats
      if (typeof accessTokenOrParams === 'string') {
        accessToken = accessTokenOrParams
        usernameValue = username!
      } else {
        accessToken = accessTokenOrParams.accessToken
        usernameValue = accessTokenOrParams.username
      }

      const user = await account.get()
      
      // Check if connection already exists
      const { documents: existingConnections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (existingConnections.length > 0) {
        // Update existing connection
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          existingConnections[0].$id,
          {
            username: usernameValue,
            access_token: accessToken
          }
        )
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        await offlineStore.setItem(CACHE_KEYS.CONNECTION, updatedData[0])
        
        return updatedData[0]
      } else {
        // Create new connection
        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          ID.unique(),
          {
            user_id: user.$id,
            username: usernameValue,
            access_token: accessToken
          }
        )
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        await offlineStore.setItem(CACHE_KEYS.CONNECTION, newData[0])
        
        return newData[0]
      }
    } catch (error) {
      console.error("Error connecting GitHub:", error)
      throw error
    }
  },

  // Disconnect GitHub account
  async disconnectGitHub() {
    try {
      const user = await account.get()
      
      // Delete connection from database
      const { documents: connections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (connections.length > 0) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          connections[0].$id
        )
      }
      
      // Remove stored tokens
      await SecureStore.deleteItemAsync('github_access_token')
      await SecureStore.deleteItemAsync('github_username')
      
      // Clear caches
      await offlineStore.removeItem(CACHE_KEYS.CONNECTION)
      await offlineStore.removeItem(CACHE_KEYS.REPOSITORIES)
      await offlineStore.removeItem(CACHE_KEYS.COMMITS)
      
      return true
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      throw error
    }
  },

  // Get GitHub connection
  async getGitHubConnection() {
    try {
      const user = await account.get()
      
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (documents.length > 0) {
        return documents[0] as unknown as GithubConnection
      }
      
      return null
    } catch (error) {
      console.error("Error getting GitHub connection:", error)
      return null
    }
  },

  // Fetch and cache repositories
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
        await this.saveRepository({
          repo_id: repo.id.toString(),
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url
        })
      }

      // Fetch and cache the updated repositories
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('$updatedAt')
        ]
      )

      if (documents) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, documents)
      }
    } catch (error) {
      console.error("Error fetching and caching repositories:", error)
    }
  },

  // Save repository
  async saveRepository(repoData: Omit<GithubRepository, '$id' | '$createdAt' | '$updatedAt' | 'user_id' | 'project_id'>) {
    try {
      const user = await account.get()
      
      // Check if repository already exists
      const { documents: existingRepos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.equal('repo_id', repoData.repo_id)
        ]
      )

      if (existingRepos.length > 0) {
        // Update existing repository
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_REPOSITORIES,
          existingRepos[0].$id,
          {
            name: repoData.name,
            full_name: repoData.full_name,
            description: repoData.description,
            html_url: repoData.html_url
          }
        )
        return updatedData[0]
      } else {
        // Create new repository
        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_REPOSITORIES,
          ID.unique(),
          {
            ...repoData,
            user_id: user.$id,
            project_id: null
          }
        )
        return newData[0]
      }
    } catch (error) {
      console.error("Error saving repository:", error)
      return null
    }
  },

  // Get repositories
  async getRepositories() {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        // Return cached repositories if offline
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      }

      const user = await account.get()
      if (!user) throw new Error("User not authenticated")

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.orderDesc('$updatedAt')
        ]
      )

      // Cache the repositories data
      if (documents) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, documents)
      }

      return documents as unknown as GithubRepository[]
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error)

      // Try to get from cache if there's an error
      const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
      return cachedRepos || []
    }
  },

  // Get repository by ID
  async getRepositoryById(id: string) {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [Query.equal('$id', id)]
      )

      if (documents.length > 0) {
        return documents[0] as unknown as GithubRepository
      }
      
      return null
    } catch (error) {
      console.error("Error getting repository by ID:", error)
      return null
    }
  },

  // Link repository to project
  async linkRepositoryToProject(repoId: string, projectId: string) {
    try {
      const { documents: repos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [Query.equal('$id', repoId)]
      )

      if (repos.length > 0) {
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_REPOSITORIES,
          repos[0].$id,
          { project_id: projectId }
        )
        return updatedData[0]
      }
      
      return null
    } catch (error) {
      console.error("Error linking repository to project:", error)
      return null
    }
  },

  // Get commits for repository
  async getCommits(repositoryId: string) {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_COMMITS,
        [
          Query.equal('repository_id', repositoryId),
          Query.orderDesc('committed_at')
        ]
      )

      return documents as unknown as GithubCommit[]
    } catch (error) {
      console.error("Error getting commits:", error)
      return []
    }
  },

  // Save commit
  async saveCommit(commitData: Omit<GithubCommit, '$id' | '$createdAt' | 'user_id'>) {
    try {
      const user = await account.get()
      
      // Check if commit already exists
      const { documents: existingCommits } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_COMMITS,
        [
          Query.equal('commit_id', commitData.commit_id),
          Query.equal('repository_id', commitData.repository_id)
        ]
      )

      if (existingCommits.length > 0) {
        return existingCommits[0]
      }

      // Create new commit
      const { documents: newData } = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GITHUB_COMMITS,
        ID.unique(),
        {
          ...commitData,
          user_id: user.$id
        }
      )

      return newData[0]
    } catch (error) {
      console.error("Error saving commit:", error)
      return null
    }
  },

  // Get GitHub connection
  async getConnection() {
    return this.getGitHubConnection()
  },

  // Add repository
  async addRepository(repoData: {
    name: string
    full_name: string
    html_url: string
    project_id?: string | null
  }) {
    try {
      const user = await account.get()
      
      // Extract repo_id from the URL
      const urlParts = repoData.html_url.split('/')
      const repo_id = `${urlParts[3]}/${urlParts[4]}`
      
      // Check if repository already exists
      const { documents: existingRepos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.equal('full_name', repoData.full_name)
        ]
      )

      if (existingRepos.length > 0) {
        // Update existing repository
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_REPOSITORIES,
          existingRepos[0].$id,
          {
            name: repoData.name,
            full_name: repoData.full_name,
            html_url: repoData.html_url,
            project_id: repoData.project_id || null
          }
        )
        return updatedData[0]
      } else {
        // Create new repository
        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_REPOSITORIES,
          ID.unique(),
          {
            repo_id,
            name: repoData.name,
            full_name: repoData.full_name,
            html_url: repoData.html_url,
            user_id: user.$id,
            project_id: repoData.project_id || null
          }
        )
        return newData[0]
      }
    } catch (error) {
      console.error("Error adding repository:", error)
      throw error
    }
  },

  // Get commit by ID
  async getCommitById(commitId: string) {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (documents.length > 0) {
        return documents[0] as unknown as GithubCommit
      }
      
      return null
    } catch (error) {
      console.error("Error getting commit by ID:", error)
      return null
    }
  },

  // Link commit to task
  async linkCommitToTask(commitId: string, taskId: string) {
    try {
      const { documents: commits } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (commits.length > 0) {
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_COMMITS,
          commits[0].$id,
          { task_id: taskId }
        )
        return updatedData[0]
      }
      
      return null
    } catch (error) {
      console.error("Error linking commit to task:", error)
      return null
    }
  },

  // Set selected repository (for caching)
  async setSelectedRepository(repoId: string) {
    try {
      await offlineStore.setItem('selected_repository_id', repoId)
    } catch (error) {
      console.error("Error setting selected repository:", error)
    }
  },

  // Fetch commits for repository
  async fetchCommitsForRepository(repoId: string) {
    try {
      const connection = await this.getGitHubConnection()
      if (!connection) {
        throw new Error("GitHub not connected")
      }

      const repo = await this.getRepositoryById(repoId)
      if (!repo) {
        throw new Error("Repository not found")
      }

      // Fetch commits from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/commits?per_page=50`, {
        headers: {
          Authorization: `token ${connection.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const commits = await response.json()

      // Save commits to database
      for (const commit of commits) {
        await this.saveCommit({
          commit_id: commit.sha,
          repository_id: repoId,
          message: commit.commit.message,
          author: commit.commit.author.name,
          committed_at: new Date(commit.commit.author.date).toISOString(),
          html_url: commit.html_url,
          task_id: null
        })
      }

      return commits
    } catch (error) {
      console.error("Error fetching commits for repository:", error)
      throw error
    }
  },

  // Disconnect GitHub (alias for disconnectGitHub)
  async disconnectGithub() {
    return this.disconnectGitHub()
  }
}
