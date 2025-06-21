"use client"

import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef, useState, useEffect } from "react"
import { useColorScheme } from "react-native"

import { ProjectCard } from "@/components/ProjectCard"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function ProjectsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Animation for the add button
  const scaleAnim = useRef(new Animated.Value(1)).current

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

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error("Error loading projects:", error)
      showToast("Failed to load projects", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadProjects()
  }

  const handleProjectPress = (projectId: string) => {
    // Validate project ID before navigation
    if (!projectId || projectId.trim() === '') {
      console.error('Invalid project ID:', projectId)
      showToast("Invalid project ID", { type: "error" })
      return
    }
    
    // Navigate to project details
    router.push(`/project/${projectId}`)
  }

  const handleNewProject = () => {
    // Navigate to new project screen
    router.push("/new-project")
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Projects</Text>
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

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={projects.filter(item => item.$id || item.id)}
          keyExtractor={(item) => item.$id || item.id}
          renderItem={({ item }) => {
            const projectId = item.$id || item.id
            if (!projectId) return null
            
            return (
              <Pressable
                onPress={() => handleProjectPress(projectId)}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <ProjectCard project={item} />
              </Pressable>
            )
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim }]}>No projects yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
                Tap the "New Project" button to create your first project
              </Text>
            </View>
          }
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
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
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
})
