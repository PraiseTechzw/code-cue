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

      // Validate inputs
      if (!accessToken || !usernameValue) {
        console.error("Invalid inputs:", { accessToken: !!accessToken, usernameValue: !!usernameValue })
        throw new Error("Access token and username are required")
      }

      // Ensure values are strings and trim whitespace
      accessToken = String(accessToken).trim()
      usernameValue = String(usernameValue).trim()

      if (!accessToken || !usernameValue) {
        console.error("Empty values after trimming:", { accessToken: !!accessToken, usernameValue: !!usernameValue })
        throw new Error("Access token and username cannot be empty")
      }

      console.log("Getting user account...")
      const user = await account.get()
      if (!user || !user.$id) {
        console.error("User authentication failed:", { user: !!user, userId: user?.$id })
        throw new Error("User not authenticated")
      }

      console.log("User authenticated:", { userId: user.$id })

      // Test database connection
      console.log("Testing database connection...")
      try {
        const testQuery = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          [Query.equal('user_id', user.$id)]
        )
        console.log("Database connection test successful")
      } catch (dbError) {
        console.error("Database connection test failed:", dbError)
        throw new Error("Database connection failed")
      }

      console.log("Checking existing connections...")
      // Check if connection already exists
      const { documents: existingConnections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      console.log("Existing connections found:", existingConnections.length)

      if (existingConnections && existingConnections.length > 0) {
        console.log("Updating existing connection...")
        // Update existing connection
        const existingConnection = existingConnections[0]
        if (!existingConnection || !existingConnection.$id) {
          console.error("Invalid existing connection:", existingConnection)
          throw new Error("Invalid existing connection data")
        }

        const updateData = {
          username: usernameValue,
          access_token: accessToken
        }
        console.log("Update data:", { username: updateData.username, hasToken: !!updateData.access_token })

        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          existingConnection.$id,
          updateData
        )
        
        console.log("Connection updated successfully")
        console.log("Updated data result:", { hasUpdatedData: !!updatedData, updatedDataLength: updatedData?.length })
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (updatedData && updatedData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, updatedData[0])
        }
        
        if (!updatedData || !updatedData[0]) {
          console.error("No data returned from updateDocument")
          throw new Error("Failed to update GitHub connection")
        }
        
        return updatedData[0]
      } else {
        console.log("Creating new connection...")
        // Create new connection
        const createData = {
          user_id: user.$id,
          username: usernameValue,
          access_token: accessToken
        }
        console.log("Create data:", { userId: createData.user_id, username: createData.username, hasToken: !!createData.access_token })

        const documentId = ID.unique()
        console.log("Generated document ID:", documentId)

        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.GITHUB_CONNECTIONS,
          documentId,
          createData
        )
        
        console.log("Connection created successfully")
        console.log("New data result:", { hasNewData: !!newData, newDataLength: newData?.length })
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (newData && newData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, newData[0])
        }
        
        if (!newData || !newData[0]) {
          console.error("No data returned from createDocument")
          throw new Error("Failed to create GitHub connection")
        }
        
        return newData[0]
      }
    } catch (error) {
      console.error("Error connecting GitHub:", error)
      console.error("Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
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
      if (!user || !user.$id) {
        console.warn("User not authenticated in getGitHubConnection")
        return null
      }
      
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (documents && documents.length > 0) {
        const connection = documents[0]
        // Validate connection data
        if (connection.user_id && connection.username && connection.access_token) {
          return connection as unknown as GithubConnection
        } else {
          console.warn("Invalid connection data found:", connection)
          return null
        }
      }
      
      return null
    } catch (error) {
      console.error("Error getting GitHub connection:", error)
      return null
    }
  },

  // Get GitHub connection (alias)
  async getConnection() {
    return this.getGitHubConnection()
  },

  // Fetch and cache repositories
  async fetchAndCacheRepositories(accessToken: string, userId: string) {
    try {
      // Validate inputs
      if (!accessToken || !userId) {
        console.error("Invalid inputs for fetchAndCacheRepositories:", { accessToken: !!accessToken, userId: !!userId })
        throw new Error("Access token and user ID are required")
      }

      // Fetch repositories from GitHub API
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
      }

      const repos = await response.json()

      // Validate repos array
      if (!Array.isArray(repos)) {
        console.error("Invalid response from GitHub API:", repos)
        throw new Error("Invalid response format from GitHub API")
      }

      console.log(`Fetched ${repos.length} repositories from GitHub`)

      // Save repositories to database
      let savedCount = 0
      for (const repo of repos) {
        try {
          // Validate and sanitize repository data before saving
          if (repo && repo.id && repo.name && repo.full_name && repo.html_url) {
            await this.saveRepository({
              repo_id: repo.id.toString(),
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description || null,
              html_url: repo.html_url
            })
            savedCount++
          } else {
            console.warn("Skipping invalid repository data:", repo)
          }
        } catch (repoError) {
          console.error("Error saving individual repository:", repoError, repo)
          // Continue with other repositories
        }
      }

      console.log(`Successfully saved ${savedCount} repositories to database`)

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
        console.log(`Cached ${documents.length} repositories`)
      }
    } catch (error) {
      console.error("Error fetching and caching repositories:", error)
      throw error // Re-throw to allow calling code to handle
    }
  },

  // Save repository
  async saveRepository(repoData: Omit<GithubRepository, '$id' | '$createdAt' | '$updatedAt' | 'user_id' | 'project_id'>) {
    try {
      const user = await account.get()
      
      // Validate required fields
      if (!repoData.repo_id || !repoData.name || !repoData.full_name || !repoData.html_url) {
        console.warn("Invalid repository data:", repoData)
        return null
      }
      
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
            description: repoData.description || null,
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
            repo_id: repoData.repo_id,
            name: repoData.name,
            full_name: repoData.full_name,
            description: repoData.description || null,
            html_url: repoData.html_url,
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
      if (!user || !user.$id) {
        console.warn("User not authenticated in getRepositories")
        throw new Error("User not authenticated")
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.orderDesc('$updatedAt')
        ]
      )

      // Cache the repositories data
      if (documents && Array.isArray(documents)) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, documents)
      }

      return documents as unknown as GithubRepository[]
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error)

      // Try to get from cache if there's an error
      try {
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      } catch (cacheError) {
        console.error("Error getting cached repositories:", cacheError)
        return []
      }
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
  async saveCommit(commitData: Omit<GithubCommit, '$id' | '$createdAt'>) {
    try {
      // Validate required fields
      if (!commitData.commit_id || !commitData.repository_id || !commitData.message || !commitData.author || !commitData.committed_at || !commitData.html_url) {
        console.warn("Invalid commit data:", commitData)
        return null
      }
      
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
          commit_id: commitData.commit_id,
          repository_id: commitData.repository_id,
          message: commitData.message,
          author: commitData.author,
          committed_at: commitData.committed_at,
          html_url: commitData.html_url,
          task_id: commitData.task_id || null
        }
      )

      return newData[0]
    } catch (error) {
      console.error("Error saving commit:", error)
      return null
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
        // Validate and sanitize commit data before saving
        if (commit && commit.sha && commit.commit && commit.commit.message && commit.commit.author && commit.html_url) {
          await this.saveCommit({
            commit_id: commit.sha,
            repository_id: repoId,
            message: commit.commit.message,
            author: commit.commit.author.name || 'Unknown',
            committed_at: new Date(commit.commit.author.date).toISOString(),
            html_url: commit.html_url,
            task_id: null
          })
        } else {
          console.warn("Skipping invalid commit data:", commit)
        }
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