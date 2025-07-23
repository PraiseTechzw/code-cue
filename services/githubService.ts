import { databases, account, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite"
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

// Test collection access
const testCollectionAccess = async (collectionName: string) => {
  try {
    
    // Test with a simple query
    const result = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [Query.limit(1)]
    )
    
    return true
  } catch (error) {
    return false
  }
}

export const githubService = {
  // Quick debug function - call this from console
  async quickDebug() {
    
    try {
      // Test each collection individually
      const collections = [
        { name: 'GITHUB_CONNECTIONS', id: COLLECTION_IDS.GITHUB_CONNECTIONS },
        { name: 'GITHUB_REPOSITORIES', id: COLLECTION_IDS.GITHUB_REPOSITORIES },
        { name: 'GITHUB_COMMITS', id: COLLECTION_IDS.GITHUB_COMMITS }
      ]
      
      for (const collection of collections) {
        try {
          const result = await databases.listDocuments(
            DATABASE_ID,
            collection.id,
            [Query.limit(1)]
          )
        } catch (error) {
        }
      }
      
      // Test getGitHubConnection specifically
      try {
        const connection = await this.getGitHubConnection()
      } catch (error) {
      }
      
    } catch (error) {
    }
  },

  // Test all collections
  async testAllCollections() {
    
    const collections = [
      COLLECTION_IDS.GITHUB_CONNECTIONS,
      COLLECTION_IDS.GITHUB_REPOSITORIES,
      COLLECTION_IDS.GITHUB_COMMITS
    ]
    
    const results: Record<string, boolean> = {}
    
    for (const collection of collections) {
      results[collection] = await testCollectionAccess(collection)
    }
    
    return results
  },

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
        throw new Error("Access token and username are required")
      }

      // Ensure values are strings and trim whitespace
      accessToken = String(accessToken).trim()
      usernameValue = String(usernameValue).trim()

      if (!accessToken || !usernameValue) {
        throw new Error("Access token and username cannot be empty")
      }

      const user = await account.get()
      if (!user || !user.$id) {
        throw new Error("User not authenticated")
      }

      // Test database connection and collection access
      try {
        const testQuery = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          [Query.equal('user_id', user.$id)]
        )
      } catch (dbError) {
        throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      }

      // Check if connection already exists
      const { documents: existingConnections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (existingConnections && existingConnections.length > 0) {
        // Update existing connection
        const existingConnection = existingConnections[0]
        if (!existingConnection || !existingConnection.$id) {
          throw new Error("Invalid existing connection data")
        }

        const updateData = {
          username: usernameValue,
          access_token: accessToken
        }

        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          existingConnection.$id,
          updateData
        )
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (updatedData && updatedData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, updatedData[0])
        }
        
        if (!updatedData || !updatedData[0]) {
          throw new Error("Failed to update GitHub connection")
        }
        
        return updatedData[0]
      } else {
        // Create new connection
        const createData = {
          user_id: user.$id,
          username: usernameValue,
          access_token: accessToken
        }

        const documentId = ID.unique()

        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          documentId,
          createData
        )
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (newData && newData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, newData[0])
        }
        
        if (!newData || !newData[0]) {
          throw new Error("Failed to create GitHub connection")
        }
        
        return newData[0]
      }
    } catch (error) {
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
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (connections.length > 0) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
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
      throw error
    }
  },

  // Get GitHub connection
  async getGitHubConnection() {
    
    try {
      const user = await account.get()
      if (!user || !user.$id) {
        return null
      }
      
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      if (documents && documents.length > 0) {
        const connection = documents[0]
        
        // Validate connection data
        if (connection.user_id && connection.username && connection.access_token) {
          return connection as unknown as GithubConnection
        } else {
          return null
        }
      }
      
      return null
    } catch (error) {
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
        throw new Error("Invalid response format from GitHub API")
      }

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
          }
        } catch (repoError) {
        }
      }

      // Fetch and cache the updated repositories
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('$updatedAt')
        ]
      )

      if (documents) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, documents)
      }
    } catch (error) {
      throw error // Re-throw to allow calling code to handle
    }
  },

  // Save repository
  async saveRepository(repoData: Omit<GithubRepository, '$id' | '$createdAt' | '$updatedAt' | 'user_id' | 'project_id'>) {
    
    try {
      const user = await account.get()
      
      // Validate required fields
      if (!repoData.repo_id || !repoData.name || !repoData.full_name || !repoData.html_url) {
        return null
      }
      
      // Check if repository already exists
      const { documents: existingRepos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.equal('repo_id', repoData.repo_id)
        ]
      )

      if (existingRepos.length > 0) {
        // Update existing repository
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_REPOSITORIES,
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
          COLLECTION_IDS.GITHUB_REPOSITORIES,
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
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.equal('full_name', repoData.full_name)
        ]
      )

      if (existingRepos.length > 0) {
        // Update existing repository
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_REPOSITORIES,
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
          COLLECTION_IDS.GITHUB_REPOSITORIES,
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
        throw new Error("User not authenticated")
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
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
      // Try to get from cache if there's an error
      try {
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      } catch (cacheError) {
        return []
      }
    }
  },

  // Get repository by ID
  async getRepositoryById(id: string) {
    
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [Query.equal('$id', id)]
      )

      if (documents.length > 0) {
        return documents[0] as unknown as GithubRepository
      }
      
      return null
    } catch (error) {
      return null
    }
  },

  // Link repository to project
  async linkRepositoryToProject(repoId: string, projectId: string) {
    
    try {
      const { documents: repos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [Query.equal('$id', repoId)]
      )

      if (repos.length > 0) {
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_REPOSITORIES,
          repos[0].$id,
          { project_id: projectId }
        )
        return updatedData[0]
      }
      
      return null
    } catch (error) {
      return null
    }
  },

  // Get commits for repository
  async getCommits(repositoryId: string) {
    
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [
          Query.equal('repository_id', repositoryId),
          Query.orderDesc('committed_at')
        ]
      )

      return documents as unknown as GithubCommit[]
    } catch (error) {
      return []
    }
  },

  // Save commit
  async saveCommit(commitData: Omit<GithubCommit, '$id' | '$createdAt'>) {
    
    try {
      // Validate required fields
      if (!commitData.commit_id || !commitData.repository_id || !commitData.message || !commitData.author || !commitData.committed_at || !commitData.html_url) {
        return null
      }
      
      // Check if commit already exists
      const { documents: existingCommits } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
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
        COLLECTION_IDS.GITHUB_COMMITS,
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
      return null
    }
  },

  // Get commit by ID
  async getCommitById(commitId: string) {
    
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (documents.length > 0) {
        return documents[0] as unknown as GithubCommit
      }
      
      return null
    } catch (error) {
      return null
    }
  },

  // Link commit to task
  async linkCommitToTask(commitId: string, taskId: string) {
    
    try {
      const { documents: commits } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (commits.length > 0) {
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_COMMITS,
          commits[0].$id,
          { task_id: taskId }
        )
        return updatedData[0]
      }
      
      return null
    } catch (error) {
      return null
    }
  },

  // Set selected repository (for caching)
  async setSelectedRepository(repoId: string) {
    
    try {
      await offlineStore.setItem('selected_repository_id', repoId)
    } catch (error) {
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
        }
      }

      return commits
    } catch (error) {
      throw error
    }
  },

  // Disconnect GitHub (alias for disconnectGitHub)
  async disconnectGithub() {
    return this.disconnectGitHub()
  }
} 