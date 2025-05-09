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
  ScrollView,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef, useState, useEffect, useMemo } from "react"
import { useColorScheme } from "react-native"

import { ProjectCard } from "@/components/ProjectCard"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

type FilterType = "all" | "active" | "completed" | "archived"
type SortType = "recent" | "name" | "progress" | "priority"
type PriorityType = "high" | "medium" | "low"

interface Project {
  id: string
  name: string
  description: string
  progress: number
  lastUpdated: string
  completed?: boolean
  archived?: boolean
  priority?: PriorityType
  dueDate?: string
  updatedAt: string
}

export default function ProjectsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [sortBy, setSortBy] = useState<SortType>("recent")
  const [searchQuery, setSearchQuery] = useState("")

  // Animation for the add button
  const scaleAnim = useRef(new Animated.Value(1)).current
  const filterScrollRef = useRef<ScrollView>(null)

  // Project statistics
  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => !p.completed && !p.archived).length,
      completed: projects.filter(p => p.completed).length,
      archived: projects.filter(p => p.archived).length,
      highPriority: projects.filter(p => p.priority === "high").length,
      overdue: projects.filter(p => {
        if (!p.dueDate) return false
        const dueDate = new Date(p.dueDate)
        return !p.completed && dueDate < new Date()
      }).length,
    }
  }, [projects])

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects]

    // Apply filter
    switch (activeFilter) {
      case "active":
        filtered = filtered.filter(p => !p.completed && !p.archived)
        break
      case "completed":
        filtered = filtered.filter(p => p.completed)
        break
      case "archived":
        filtered = filtered.filter(p => p.archived)
        break
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "progress":
        filtered.sort((a, b) => b.progress - a.progress)
        break
      case "priority":
        const priorityOrder: Record<PriorityType, number> = { high: 3, medium: 2, low: 1 }
        filtered.sort((a, b) => 
          (priorityOrder[b.priority as PriorityType] || 0) - (priorityOrder[a.priority as PriorityType] || 0)
        )
        break
      case "recent":
      default:
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    return filtered
  }, [projects, activeFilter, sortBy, searchQuery])

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
    router.push(`/project/${projectId}`)
  }

  const handleNewProject = () => {
    router.push("/new-project")
  }

  const renderStatCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.textDim }]}>{title}</Text>
    </View>
  )

  const renderFilterButton = (filter: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === filter && [styles.activeFilter, { backgroundColor: theme.tint }],
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          { color: activeFilter === filter ? "#fff" : theme.textDim },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )

  const renderSortButton = () => (
    <TouchableOpacity
      style={[styles.sortButton, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        // Cycle through sort options
        const options: SortType[] = ["recent", "name", "progress", "priority"]
        const currentIndex = options.indexOf(sortBy)
        const nextIndex = (currentIndex + 1) % options.length
        setSortBy(options[nextIndex])
      }}
    >
      <Ionicons name="funnel-outline" size={16} color={theme.textDim} />
      <Text style={[styles.sortText, { color: theme.textDim }]}>
        Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
      </Text>
    </TouchableOpacity>
  )

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

      <ScrollView
        ref={filterScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        {renderStatCard("Total", stats.total, "folder", theme.tint)}
        {renderStatCard("Active", stats.active, "play-circle", theme.success)}
        {renderStatCard("Completed", stats.completed, "checkmark-circle", theme.info)}
        {renderStatCard("High Priority", stats.highPriority, "alert-circle", theme.error)}
        {renderStatCard("Overdue", stats.overdue, "time", theme.warning)}
      </ScrollView>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {renderFilterButton("all", "All")}
          {renderFilterButton("active", "Active")}
          {renderFilterButton("completed", "Completed")}
          {renderFilterButton("archived", "Archived")}
          {renderSortButton()}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => handleProjectPress(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim }]}>
                {searchQuery ? "No matching projects" : "No projects yet"}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : 'Tap the "New Project" button to create your first project'}
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
  statsContainer: {
    maxHeight: 100,
    marginBottom: 16,
  },
  statsContent: {
    paddingHorizontal: 16,
  },
  statCard: {
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  activeFilter: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sortText: {
    fontSize: 14,
    marginLeft: 4,
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
