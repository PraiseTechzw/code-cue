import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TextInput,
  StatusBar,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef, useState, useEffect, useCallback } from "react"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { ProjectCard } from "@/components/ProjectCard"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import Colors from "@/constants/Colors"

export default function ProjectsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projects, setProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Animation for the add button
  const scaleAnim = useRef(new Animated.Value(1)).current
  const searchBarAnim = useRef(new Animated.Value(0)).current
  const headerAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const toggleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isSearching) {
      // Close search
      Animated.parallel([
        Animated.timing(searchBarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsSearching(false)
        setSearchQuery("")
      })
    } else {
      // Open search
      setIsSearching(true)
      Animated.parallel([
        Animated.timing(searchBarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start()
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(project => 
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProjects(filtered)
    }
  }, [projects, searchQuery])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await projectService.getProjects()
      
      // Ensure all projects have valid IDs
      const validProjects = data.filter(project => {
        const projectId = project.$id
        if (!projectId || projectId.trim() === '') {
          console.warn('Invalid project found:', project)
          return false
        }
        return true
      })
      
      setProjects(validProjects)
    } catch (error) {
      console.error("Error loading projects:", error)
      setError("Failed to load projects. Please try again.")
      showToast("Failed to load projects", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadProjects()
  }, [])

  const handleProjectPress = useCallback((project: any) => {
    // Validate project ID before navigation
    const projectId = project.$id
    if (!projectId || projectId.trim() === '') {
      console.error('Invalid project ID:', projectId)
      showToast("Invalid project ID", { type: "error" })
      return
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Navigate to project details
    router.push(`/project/${projectId}`)
  }, [showToast])

  const handleNewProject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Navigate to new project screen
    router.push("/new-project")
  }

  const renderProjectCard = useCallback(({ item }: { item: any }) => {
    const projectId = item.$id
    if (!projectId) return null
    
    return (
      <Pressable
        onPress={() => handleProjectPress(item)}
        style={({ pressed }) => [
          { 
            opacity: pressed ? 0.9 : 1, 
            transform: [{ scale: pressed ? 0.98 : 1 }] 
          }
        ]}
      >
        <ProjectCard project={item} />
      </Pressable>
    )
  }, [handleProjectPress])

  const renderEmptyState = () => {
    if (loading) return null
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.error} />
          <Text style={[styles.emptyText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.tint }]}
            onPress={loadProjects}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (searchQuery && filteredProjects.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color={theme.textDim} />
          <Text style={[styles.emptyText, { color: theme.textDim }]}>No projects found</Text>
          <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
            Try adjusting your search terms
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.textDim }]}>No projects yet</Text>
        <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
          Tap the "New Project" button to create your first project
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={[styles.title, { color: theme.text }]}>My Projects</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardBackground }]}
            onPress={toggleSearch}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isSearching ? "close" : "search"} 
              size={20} 
              color={theme.text} 
            />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.newButton, { backgroundColor: theme.tint }]}
              onPress={handleNewProject}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.newButtonText}>New Project</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.searchContainer, 
          { 
            height: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 60],
            }),
            opacity: searchBarAnim,
          }
        ]}
      >
        <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search projects..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading projects...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.$id}
          renderItem={renderProjectCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            filteredProjects.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: theme.textDim }]}>
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <ConnectionStatus />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  newButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    overflow: "hidden",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
})
