import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { githubService } from '@/services/githubService'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'

interface DebugResult {
  collection: string
  success: boolean
  error?: string
  details?: any
}

export const GitHubDebugger: React.FC = () => {
  const [results, setResults] = useState<DebugResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const testCollection = async (collectionName: string): Promise<DebugResult> => {
    try {
      console.log(`[DEBUG] Testing collection: ${collectionName}`)
      
      // Test basic access
      const result = await databases.listDocuments(
        DATABASE_ID,
        collectionName,
        [Query.limit(1)]
      )
      
      console.log(`[DEBUG] ✅ Successfully accessed collection: ${collectionName}`, {
        total: result.total,
        documents: result.documents.length
      })
      
      return {
        collection: collectionName,
        success: true,
        details: {
          total: result.total,
          documents: result.documents.length
        }
      }
    } catch (error) {
      console.log(`[DEBUG] ❌ Failed to access collection: ${collectionName}`, {
        error: error instanceof Error ? error.message : String(error),
        collectionName,
        databaseId: DATABASE_ID
      })
      
      return {
        collection: collectionName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          collectionName,
          databaseId: DATABASE_ID
        }
      }
    }
  }

  const runAllTests = async () => {
    setIsLoading(true)
    setResults([])
    
    try {
      console.log('[DEBUG] Starting comprehensive GitHub debugging...')
      
      const collections = [
        COLLECTION_IDS.GITHUB_CONNECTIONS,
        COLLECTION_IDS.GITHUB_REPOSITORIES,
        COLLECTION_IDS.GITHUB_COMMITS
      ]
      
      console.log('[DEBUG] Collections to test:', collections)
      console.log('[DEBUG] Database ID:', DATABASE_ID)
      
      const testResults: DebugResult[] = []
      
      // Test each collection
      for (const collection of collections) {
        const result = await testCollection(collection)
        testResults.push(result)
        setResults([...testResults]) // Update UI as we go
      }
      
      // Test GitHub service methods
      console.log('[DEBUG] Testing GitHub service methods...')
      
      try {
        const serviceTestResult = await githubService.testAllCollections()
        console.log('[DEBUG] Service test results:', serviceTestResult)
        
        testResults.push({
          collection: 'GitHub Service Test',
          success: Object.values(serviceTestResult).every(Boolean),
          details: serviceTestResult
        })
      } catch (serviceError) {
        console.log('[DEBUG] Service test failed:', serviceError)
        testResults.push({
          collection: 'GitHub Service Test',
          success: false,
          error: serviceError instanceof Error ? serviceError.message : String(serviceError)
        })
      }
      
      setResults(testResults)
      
      // Show summary
      const successCount = testResults.filter(r => r.success).length
      const totalCount = testResults.length
      
      Alert.alert(
        'Debug Complete',
        `${successCount}/${totalCount} tests passed.\n\nCheck console for detailed logs.`,
        [{ text: 'OK' }]
      )
      
    } catch (error) {
      console.log('[DEBUG] Error during debugging:', error)
      Alert.alert('Debug Error', error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const getResultColor = (success: boolean) => {
    return success ? '#4CAF50' : '#F44336'
  }

  const getResultIcon = (success: boolean) => {
    return success ? '✅' : '❌'
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>GitHub Debugger</Text>
      <Text style={styles.subtitle}>Test GitHub collections and connections</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={runAllTests}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Running Tests...' : 'Run All Tests'}
        </Text>
      </TouchableOpacity>
      
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>{getResultIcon(result.success)}</Text>
                <Text style={[styles.resultCollection, { color: getResultColor(result.success) }]}>
                  {result.collection}
                </Text>
              </View>
              
              {result.error && (
                <Text style={styles.errorText}>Error: {result.error}</Text>
              )}
              
              {result.details && (
                <Text style={styles.detailsText}>
                  Details: {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Current Configuration:</Text>
        <Text style={styles.infoText}>Database ID: {DATABASE_ID}</Text>
        <Text style={styles.infoText}>GitHub Connections: {COLLECTION_IDS.GITHUB_CONNECTIONS}</Text>
        <Text style={styles.infoText}>GitHub Repositories: {COLLECTION_IDS.GITHUB_REPOSITORIES}</Text>
        <Text style={styles.infoText}>GitHub Commits: {COLLECTION_IDS.GITHUB_COMMITS}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333'
  },
  resultItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8
  },
  resultCollection: {
    fontSize: 16,
    fontWeight: '600'
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 4
  },
  detailsText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace'
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace'
  }
}) 