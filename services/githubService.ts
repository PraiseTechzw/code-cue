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

// Debug helper function
const debugLog = (functionName: string, message: string, data?: any) => {
  console.log(`[GitHubService.${functionName}] ${message}`, data || '')
}

// Test collection access
const testCollectionAccess = async (collectionName: string) => {
  try {
    debugLog('testCollectionAccess', `Testing access to collection: ${collectionName}`)
    
    // Test with a simple query
    const result = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [Query.limit(1)]
    )
    
    debugLog('testCollectionAccess', `✅ Successfully accessed collection: ${collectionName}`, {
      total: result.total,
      documents: result.documents.length
    })
    
    return true
  } catch (error) {
    debugLog('testCollectionAccess', `❌ Failed to access collection: ${collectionName}`, {
      error: error instanceof Error ? error.message : String(error),
      collectionName,
      databaseId: DATABASE_ID
    })
    return false
  }
}

export const githubService = {
  // Quick debug function - call this from console
  async quickDebug() {
    console.log('🔍 [GitHubService] Starting quick debug...')
    console.log('🔍 [GitHubService] Database ID:', DATABASE_ID)
    console.log('🔍 [GitHubService] Collections:', {
      GITHUB_CONNECTIONS: COLLECTION_IDS.GITHUB_CONNECTIONS,
      GITHUB_REPOSITORIES: COLLECTION_IDS.GITHUB_REPOSITORIES,
      GITHUB_COMMITS: COLLECTION_IDS.GITHUB_COMMITS
    })
    
    try {
      // Test each collection individually
      const collections = [
        { name: 'GITHUB_CONNECTIONS', id: COLLECTION_IDS.GITHUB_CONNECTIONS },
        { name: 'GITHUB_REPOSITORIES', id: COLLECTION_IDS.GITHUB_REPOSITORIES },
        { name: 'GITHUB_COMMITS', id: COLLECTION_IDS.GITHUB_COMMITS }
      ]
      
      for (const collection of collections) {
        console.log(`🔍 [GitHubService] Testing ${collection.name}: ${collection.id}`)
        try {
          const result = await databases.listDocuments(
            DATABASE_ID,
            collection.id,
            [Query.limit(1)]
          )
          console.log(`✅ [GitHubService] ${collection.name} - SUCCESS:`, {
            total: result.total,
            documents: result.documents.length
          })
        } catch (error) {
          console.log(`❌ [GitHubService] ${collection.name} - FAILED:`, {
            error: error instanceof Error ? error.message : String(error),
            collectionId: collection.id,
            databaseId: DATABASE_ID
          })
        }
      }
      
      // Test getGitHubConnection specifically
      console.log('🔍 [GitHubService] Testing getGitHubConnection...')
      try {
        const connection = await this.getGitHubConnection()
        console.log('✅ [GitHubService] getGitHubConnection result:', connection)
      } catch (error) {
        console.log('❌ [GitHubService] getGitHubConnection failed:', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
      
    } catch (error) {
      console.log('❌ [GitHubService] Quick debug failed:', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  },

  // Test all collections
  async testAllCollections() {
    debugLog('testAllCollections', 'Starting collection access tests...')
    
    const collections = [
      COLLECTION_IDS.GITHUB_CONNECTIONS,
      COLLECTION_IDS.GITHUB_REPOSITORIES,
      COLLECTION_IDS.GITHUB_COMMITS
    ]
    
    const results: Record<string, boolean> = {}
    
    for (const collection of collections) {
      results[collection] = await testCollectionAccess(collection)
    }
    
    debugLog('testAllCollections', 'Collection test results:', results)
    return results
  },

  // Connect GitHub account
  async connectGitHub(accessTokenOrParams: string | { accessToken: string; username: string }, username?: string) {
    debugLog('connectGitHub', 'Starting GitHub connection process...')
    
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
        debugLog('connectGitHub', '❌ Invalid inputs', { accessToken: !!accessToken, usernameValue: !!usernameValue })
        throw new Error("Access token and username are required")
      }

      // Ensure values are strings and trim whitespace
      accessToken = String(accessToken).trim()
      usernameValue = String(usernameValue).trim()

      if (!accessToken || !usernameValue) {
        debugLog('connectGitHub', '❌ Empty values after trimming', { accessToken: !!accessToken, usernameValue: !!usernameValue })
        throw new Error("Access token and username cannot be empty")
      }

      debugLog('connectGitHub', 'Getting user account...')
      const user = await account.get()
      if (!user || !user.$id) {
        debugLog('connectGitHub', '❌ User authentication failed', { user: !!user, userId: user?.$id })
        throw new Error("User not authenticated")
      }

      debugLog('connectGitHub', '✅ User authenticated', { userId: user.$id })

      // Test database connection and collection access
      debugLog('connectGitHub', 'Testing database connection...')
      try {
        debugLog('connectGitHub', `Testing collection: ${COLLECTION_IDS.GITHUB_CONNECTIONS}`)
        const testQuery = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          [Query.equal('user_id', user.$id)]
        )
        debugLog('connectGitHub', '✅ Database connection test successful', {
          total: testQuery.total,
          documents: testQuery.documents.length
        })
      } catch (dbError) {
        debugLog('connectGitHub', '❌ Database connection test failed', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          collection: COLLECTION_IDS.GITHUB_CONNECTIONS,
          databaseId: DATABASE_ID,
          userId: user.$id
        })
        throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      }

      debugLog('connectGitHub', 'Checking existing connections...')
      // Check if connection already exists
      const { documents: existingConnections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      debugLog('connectGitHub', 'Existing connections found', { count: existingConnections.length })

      if (existingConnections && existingConnections.length > 0) {
        debugLog('connectGitHub', 'Updating existing connection...')
        // Update existing connection
        const existingConnection = existingConnections[0]
        if (!existingConnection || !existingConnection.$id) {
          debugLog('connectGitHub', '❌ Invalid existing connection', existingConnection)
          throw new Error("Invalid existing connection data")
        }

        const updateData = {
          username: usernameValue,
          access_token: accessToken
        }
        debugLog('connectGitHub', 'Update data prepared', { username: updateData.username, hasToken: !!updateData.access_token })

        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          existingConnection.$id,
          updateData
        )
        
        debugLog('connectGitHub', '✅ Connection updated successfully')
        debugLog('connectGitHub', 'Updated data result', { hasUpdatedData: !!updatedData, updatedDataLength: updatedData?.length })
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (updatedData && updatedData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, updatedData[0])
        }
        
        if (!updatedData || !updatedData[0]) {
          debugLog('connectGitHub', '❌ No data returned from updateDocument')
          throw new Error("Failed to update GitHub connection")
        }
        
        return updatedData[0]
      } else {
        debugLog('connectGitHub', 'Creating new connection...')
        // Create new connection
        const createData = {
          user_id: user.$id,
          username: usernameValue,
          access_token: accessToken
        }
        debugLog('connectGitHub', 'Create data prepared', { userId: createData.user_id, username: createData.username, hasToken: !!createData.access_token })

        const documentId = ID.unique()
        debugLog('connectGitHub', 'Generated document ID', documentId)

        const { documents: newData } = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          documentId,
          createData
        )
        
        debugLog('connectGitHub', '✅ Connection created successfully')
        debugLog('connectGitHub', 'New data result', { hasNewData: !!newData, newDataLength: newData?.length })
        
        // Store token securely
        await SecureStore.setItemAsync('github_access_token', accessToken)
        await SecureStore.setItemAsync('github_username', usernameValue)
        
        // Cache connection
        if (newData && newData[0]) {
          await offlineStore.setItem(CACHE_KEYS.CONNECTION, newData[0])
        }
        
        if (!newData || !newData[0]) {
          debugLog('connectGitHub', '❌ No data returned from createDocument')
          throw new Error("Failed to create GitHub connection")
        }
        
        return newData[0]
      }
    } catch (error) {
      debugLog('connectGitHub', '❌ Error connecting GitHub', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  },

  // Disconnect GitHub account
  async disconnectGitHub() {
    debugLog('disconnectGitHub', 'Starting GitHub disconnection...')
    
    try {
      const user = await account.get()
      debugLog('disconnectGitHub', 'User retrieved', { userId: user.$id })
      
      // Delete connection from database
      debugLog('disconnectGitHub', `Querying collection: ${COLLECTION_IDS.GITHUB_CONNECTIONS}`)
      const { documents: connections } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      debugLog('disconnectGitHub', 'Found connections', { count: connections.length })

      if (connections.length > 0) {
        debugLog('disconnectGitHub', 'Deleting connection', { connectionId: connections[0].$id })
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_CONNECTIONS,
          connections[0].$id
        )
        debugLog('disconnectGitHub', '✅ Connection deleted successfully')
      }
      
      // Remove stored tokens
      await SecureStore.deleteItemAsync('github_access_token')
      await SecureStore.deleteItemAsync('github_username')
      debugLog('disconnectGitHub', '✅ Stored tokens removed')
      
      // Clear caches
      await offlineStore.removeItem(CACHE_KEYS.CONNECTION)
      await offlineStore.removeItem(CACHE_KEYS.REPOSITORIES)
      await offlineStore.removeItem(CACHE_KEYS.COMMITS)
      debugLog('disconnectGitHub', '✅ Caches cleared')
      
      return true
    } catch (error) {
      debugLog('disconnectGitHub', '❌ Error disconnecting GitHub', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  },

  // Get GitHub connection
  async getGitHubConnection() {
    debugLog('getGitHubConnection', 'Getting GitHub connection...')
    
    try {
      const user = await account.get()
      if (!user || !user.$id) {
        debugLog('getGitHubConnection', '❌ User not authenticated')
        return null
      }
      
      debugLog('getGitHubConnection', 'User authenticated', { userId: user.$id })
      debugLog('getGitHubConnection', `Querying collection: ${COLLECTION_IDS.GITHUB_CONNECTIONS}`)
      
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        [Query.equal('user_id', user.$id)]
      )

      debugLog('getGitHubConnection', 'Query results', { 
        documentsFound: documents.length,
        collection: COLLECTION_IDS.GITHUB_CONNECTIONS,
        databaseId: DATABASE_ID,
        userId: user.$id
      })

      if (documents && documents.length > 0) {
        const connection = documents[0]
        debugLog('getGitHubConnection', 'Connection found', {
          connectionId: connection.$id,
          hasUserId: !!connection.user_id,
          hasUsername: !!connection.username,
          hasAccessToken: !!connection.access_token
        })
        
        // Validate connection data
        if (connection.user_id && connection.username && connection.access_token) {
          debugLog('getGitHubConnection', '✅ Valid connection data found')
          return connection as unknown as GithubConnection
        } else {
          debugLog('getGitHubConnection', '❌ Invalid connection data found', connection)
          return null
        }
      }
      
      debugLog('getGitHubConnection', 'No connection found')
      return null
    } catch (error) {
      debugLog('getGitHubConnection', '❌ Error getting GitHub connection', {
        error: error instanceof Error ? error.message : String(error),
        collection: COLLECTION_IDS.GITHUB_CONNECTIONS,
        databaseId: DATABASE_ID
      })
      return null
    }
  },

  // Get GitHub connection (alias)
  async getConnection() {
    return this.getGitHubConnection()
  },

  // Fetch and cache repositories
  async fetchAndCacheRepositories(accessToken: string, userId: string) {
    debugLog('fetchAndCacheRepositories', 'Starting repository fetch and cache...')
    
    try {
      // Validate inputs
      if (!accessToken || !userId) {
        debugLog('fetchAndCacheRepositories', '❌ Invalid inputs', { accessToken: !!accessToken, userId: !!userId })
        throw new Error("Access token and user ID are required")
      }

      debugLog('fetchAndCacheRepositories', 'Fetching from GitHub API...')
      // Fetch repositories from GitHub API
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!response.ok) {
        debugLog('fetchAndCacheRepositories', '❌ GitHub API error', { status: response.status, statusText: response.statusText })
        throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
      }

      const repos = await response.json()

      // Validate repos array
      if (!Array.isArray(repos)) {
        debugLog('fetchAndCacheRepositories', '❌ Invalid response from GitHub API', repos)
        throw new Error("Invalid response format from GitHub API")
      }

      debugLog('fetchAndCacheRepositories', `✅ Fetched ${repos.length} repositories from GitHub`)

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
            debugLog('fetchAndCacheRepositories', '⚠️ Skipping invalid repository data', repo)
          }
        } catch (repoError) {
          debugLog('fetchAndCacheRepositories', '❌ Error saving individual repository', { error: repoError, repo })
          // Continue with other repositories
        }
      }

      debugLog('fetchAndCacheRepositories', `✅ Successfully saved ${savedCount} repositories to database`)

      // Fetch and cache the updated repositories
      debugLog('fetchAndCacheRepositories', `Querying collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
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
        debugLog('fetchAndCacheRepositories', `✅ Cached ${documents.length} repositories`)
      }
    } catch (error) {
      debugLog('fetchAndCacheRepositories', '❌ Error fetching and caching repositories', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error // Re-throw to allow calling code to handle
    }
  },

  // Save repository
  async saveRepository(repoData: Omit<GithubRepository, '$id' | '$createdAt' | '$updatedAt' | 'user_id' | 'project_id'>) {
    debugLog('saveRepository', 'Saving repository...', { repoId: repoData.repo_id, name: repoData.name })
    
    try {
      const user = await account.get()
      
      // Validate required fields
      if (!repoData.repo_id || !repoData.name || !repoData.full_name || !repoData.html_url) {
        debugLog('saveRepository', '❌ Invalid repository data', repoData)
        return null
      }
      
      debugLog('saveRepository', `Checking existing repositories in collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
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
        debugLog('saveRepository', 'Updating existing repository', { repoId: existingRepos[0].$id })
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
        debugLog('saveRepository', '✅ Repository updated successfully')
        return updatedData[0]
      } else {
        debugLog('saveRepository', 'Creating new repository')
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
        debugLog('saveRepository', '✅ Repository created successfully')
        return newData[0]
      }
    } catch (error) {
      debugLog('saveRepository', '❌ Error saving repository', {
        error: error instanceof Error ? error.message : String(error),
        repoData
      })
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
    debugLog('addRepository', 'Adding repository...', { name: repoData.name, fullName: repoData.full_name })
    
    try {
      const user = await account.get()
      
      // Extract repo_id from the URL
      const urlParts = repoData.html_url.split('/')
      const repo_id = `${urlParts[3]}/${urlParts[4]}`
      
      debugLog('addRepository', `Checking existing repositories in collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
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
        debugLog('addRepository', 'Updating existing repository', { repoId: existingRepos[0].$id })
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
        debugLog('addRepository', '✅ Repository updated successfully')
        return updatedData[0]
      } else {
        debugLog('addRepository', 'Creating new repository')
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
        debugLog('addRepository', '✅ Repository created successfully')
        return newData[0]
      }
    } catch (error) {
      debugLog('addRepository', '❌ Error adding repository', {
        error: error instanceof Error ? error.message : String(error),
        repoData
      })
      throw error
    }
  },

  // Get repositories
  async getRepositories() {
    debugLog('getRepositories', 'Getting repositories...')
    
    try {
      // Check network status
      const netInfo = await NetInfo.fetch()

      if (!netInfo.isConnected) {
        debugLog('getRepositories', '⚠️ Offline mode - returning cached repositories')
        // Return cached repositories if offline
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      }

      const user = await account.get()
      if (!user || !user.$id) {
        debugLog('getRepositories', '❌ User not authenticated')
        throw new Error("User not authenticated")
      }

      debugLog('getRepositories', `Querying collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [
          Query.equal('user_id', user.$id),
          Query.orderDesc('$updatedAt')
        ]
      )

      debugLog('getRepositories', 'Query results', { 
        documentsFound: documents.length,
        collection: COLLECTION_IDS.GITHUB_REPOSITORIES,
        databaseId: DATABASE_ID,
        userId: user.$id
      })

      // Cache the repositories data
      if (documents && Array.isArray(documents)) {
        await offlineStore.setItem(CACHE_KEYS.REPOSITORIES, documents)
        debugLog('getRepositories', `✅ Cached ${documents.length} repositories`)
      }

      return documents as unknown as GithubRepository[]
    } catch (error) {
      debugLog('getRepositories', '❌ Error fetching GitHub repositories', {
        error: error instanceof Error ? error.message : String(error),
        collection: COLLECTION_IDS.GITHUB_REPOSITORIES,
        databaseId: DATABASE_ID
      })

      // Try to get from cache if there's an error
      try {
        debugLog('getRepositories', '⚠️ Trying to get from cache due to error')
        const cachedRepos = await offlineStore.getItem(CACHE_KEYS.REPOSITORIES)
        return cachedRepos || []
      } catch (cacheError) {
        debugLog('getRepositories', '❌ Error getting cached repositories', {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError)
        })
        return []
      }
    }
  },

  // Get repository by ID
  async getRepositoryById(id: string) {
    debugLog('getRepositoryById', 'Getting repository by ID...', { id })
    
    try {
      debugLog('getRepositoryById', `Querying collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [Query.equal('$id', id)]
      )

      if (documents.length > 0) {
        debugLog('getRepositoryById', '✅ Repository found', { repoId: documents[0].$id })
        return documents[0] as unknown as GithubRepository
      }
      
      debugLog('getRepositoryById', '❌ Repository not found', { id })
      return null
    } catch (error) {
      debugLog('getRepositoryById', '❌ Error getting repository by ID', {
        error: error instanceof Error ? error.message : String(error),
        id,
        collection: COLLECTION_IDS.GITHUB_REPOSITORIES,
        databaseId: DATABASE_ID
      })
      return null
    }
  },

  // Link repository to project
  async linkRepositoryToProject(repoId: string, projectId: string) {
    debugLog('linkRepositoryToProject', 'Linking repository to project...', { repoId, projectId })
    
    try {
      debugLog('linkRepositoryToProject', `Querying collection: ${COLLECTION_IDS.GITHUB_REPOSITORIES}`)
      const { documents: repos } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        [Query.equal('$id', repoId)]
      )

      if (repos.length > 0) {
        debugLog('linkRepositoryToProject', 'Updating repository with project link', { repoId: repos[0].$id })
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_REPOSITORIES,
          repos[0].$id,
          { project_id: projectId }
        )
        debugLog('linkRepositoryToProject', '✅ Repository linked to project successfully')
        return updatedData[0]
      }
      
      debugLog('linkRepositoryToProject', '❌ Repository not found', { repoId })
      return null
    } catch (error) {
      debugLog('linkRepositoryToProject', '❌ Error linking repository to project', {
        error: error instanceof Error ? error.message : String(error),
        repoId,
        projectId
      })
      return null
    }
  },

  // Get commits for repository
  async getCommits(repositoryId: string) {
    debugLog('getCommits', 'Getting commits for repository...', { repositoryId })
    
    try {
      debugLog('getCommits', `Querying collection: ${COLLECTION_IDS.GITHUB_COMMITS}`)
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [
          Query.equal('repository_id', repositoryId),
          Query.orderDesc('committed_at')
        ]
      )

      debugLog('getCommits', 'Query results', { 
        documentsFound: documents.length,
        collection: COLLECTION_IDS.GITHUB_COMMITS,
        databaseId: DATABASE_ID,
        repositoryId
      })

      return documents as unknown as GithubCommit[]
    } catch (error) {
      debugLog('getCommits', '❌ Error getting commits', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
        collection: COLLECTION_IDS.GITHUB_COMMITS,
        databaseId: DATABASE_ID
      })
      return []
    }
  },

  // Save commit
  async saveCommit(commitData: Omit<GithubCommit, '$id' | '$createdAt'>) {
    debugLog('saveCommit', 'Saving commit...', { commitId: commitData.commit_id, message: commitData.message })
    
    try {
      // Validate required fields
      if (!commitData.commit_id || !commitData.repository_id || !commitData.message || !commitData.author || !commitData.committed_at || !commitData.html_url) {
        debugLog('saveCommit', '❌ Invalid commit data', commitData)
        return null
      }
      
      debugLog('saveCommit', `Checking existing commits in collection: ${COLLECTION_IDS.GITHUB_COMMITS}`)
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
        debugLog('saveCommit', '✅ Commit already exists', { commitId: existingCommits[0].$id })
        return existingCommits[0]
      }

      debugLog('saveCommit', 'Creating new commit')
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

      debugLog('saveCommit', '✅ Commit created successfully')
      return newData[0]
    } catch (error) {
      debugLog('saveCommit', '❌ Error saving commit', {
        error: error instanceof Error ? error.message : String(error),
        commitData
      })
      return null
    }
  },

  // Get commit by ID
  async getCommitById(commitId: string) {
    debugLog('getCommitById', 'Getting commit by ID...', { commitId })
    
    try {
      debugLog('getCommitById', `Querying collection: ${COLLECTION_IDS.GITHUB_COMMITS}`)
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (documents.length > 0) {
        debugLog('getCommitById', '✅ Commit found', { commitId: documents[0].$id })
        return documents[0] as unknown as GithubCommit
      }
      
      debugLog('getCommitById', '❌ Commit not found', { commitId })
      return null
    } catch (error) {
      debugLog('getCommitById', '❌ Error getting commit by ID', {
        error: error instanceof Error ? error.message : String(error),
        commitId,
        collection: COLLECTION_IDS.GITHUB_COMMITS,
        databaseId: DATABASE_ID
      })
      return null
    }
  },

  // Link commit to task
  async linkCommitToTask(commitId: string, taskId: string) {
    debugLog('linkCommitToTask', 'Linking commit to task...', { commitId, taskId })
    
    try {
      debugLog('linkCommitToTask', `Querying collection: ${COLLECTION_IDS.GITHUB_COMMITS}`)
      const { documents: commits } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.GITHUB_COMMITS,
        [Query.equal('$id', commitId)]
      )

      if (commits.length > 0) {
        debugLog('linkCommitToTask', 'Updating commit with task link', { commitId: commits[0].$id })
        const { documents: updatedData } = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.GITHUB_COMMITS,
          commits[0].$id,
          { task_id: taskId }
        )
        debugLog('linkCommitToTask', '✅ Commit linked to task successfully')
        return updatedData[0]
      }
      
      debugLog('linkCommitToTask', '❌ Commit not found', { commitId })
      return null
    } catch (error) {
      debugLog('linkCommitToTask', '❌ Error linking commit to task', {
        error: error instanceof Error ? error.message : String(error),
        commitId,
        taskId
      })
      return null
    }
  },

  // Set selected repository (for caching)
  async setSelectedRepository(repoId: string) {
    debugLog('setSelectedRepository', 'Setting selected repository...', { repoId })
    
    try {
      await offlineStore.setItem('selected_repository_id', repoId)
      debugLog('setSelectedRepository', '✅ Selected repository cached')
    } catch (error) {
      debugLog('setSelectedRepository', '❌ Error setting selected repository', {
        error: error instanceof Error ? error.message : String(error),
        repoId
      })
    }
  },

  // Fetch commits for repository
  async fetchCommitsForRepository(repoId: string) {
    debugLog('fetchCommitsForRepository', 'Fetching commits for repository...', { repoId })
    
    try {
      const connection = await this.getGitHubConnection()
      if (!connection) {
        debugLog('fetchCommitsForRepository', '❌ GitHub not connected')
        throw new Error("GitHub not connected")
      }

      const repo = await this.getRepositoryById(repoId)
      if (!repo) {
        debugLog('fetchCommitsForRepository', '❌ Repository not found', { repoId })
        throw new Error("Repository not found")
      }

      debugLog('fetchCommitsForRepository', 'Fetching from GitHub API...', { fullName: repo.full_name })
      // Fetch commits from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/commits?per_page=50`, {
        headers: {
          Authorization: `token ${connection.access_token}`,
        },
      })

      if (!response.ok) {
        debugLog('fetchCommitsForRepository', '❌ GitHub API error', { status: response.status })
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const commits = await response.json()
      debugLog('fetchCommitsForRepository', `✅ Fetched ${commits.length} commits from GitHub API`)

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
          debugLog('fetchCommitsForRepository', '⚠️ Skipping invalid commit data', commit)
        }
      }

      debugLog('fetchCommitsForRepository', '✅ Commits saved to database successfully')
      return commits
    } catch (error) {
      debugLog('fetchCommitsForRepository', '❌ Error fetching commits for repository', {
        error: error instanceof Error ? error.message : String(error),
        repoId
      })
      throw error
    }
  },

  // Disconnect GitHub (alias for disconnectGitHub)
  async disconnectGithub() {
    return this.disconnectGitHub()
  }
} 