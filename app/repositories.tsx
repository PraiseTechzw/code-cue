"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"

import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function RepositoriesScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [repositories, setRepositories] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      setLoading(true)
      const repos = await githubService.getRepositories()
      setRepositories(repos)
    } catch (error) {
      console.error("Error loading repositories:", error)
      showToast("Failed to load repositories", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = (repo: any) => {
    // Set the selected repository and navigate back to GitHub screen
    githubService.setSelectedRepository(repo.id)
    router.back()
  }

  const handleAddRepo = () => {
    router.push("/add-repository")
  }

  const handleBack = () => {
    router.back()
  }

  const filteredRepositories = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: theme.text }]}>Repositories</Text>
        </View>
        <TouchableOpacity onPress={handleAddRepo} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search repositories..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : repositories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No repositories found</Text>
          <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
            Add a GitHub repository to track commits and link them to tasks.
          </Text>
          <TouchableOpacity style={[styles.addRepoButton, { backgroundColor: theme.tint }]} onPress={handleAddRepo}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addRepoButtonText}>Add Repository</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRepositories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.repoItem, { backgroundColor: theme.cardBackground }]}
              onPress={() => handleSelectRepo(item)}
            >
              <View style={styles.repoInfo}>
                <Text style={[styles.repoName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.repoFullName, { color: theme.textDim }]}>{item.full_name}</Text>
                {item.description && (
                  <Text style={[styles.repoDescription, { color: theme.textDim }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.repoList}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  addRepoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addRepoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  repoList: {
    padding: 16,
  },
  repoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  repoInfo: {
    flex: 1,
    marginRight: 16,
  },
  repoName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  repoFullName: {
    fontSize: 14,
    marginBottom: 8,
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
})
