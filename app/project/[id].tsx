"use client"

import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from "react-native"
import { useState, useEffect, useRef } from "react"
import { useLocalSearchParams, router } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const [filterVisible, setFilterVisible] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  // Animation for the add button
  const addButtonScale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(addButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(addButtonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  useEffect(() => {
    loadProjectData()
  }, [id])

  const loadProjectData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Load project details
      const projectData = await projectService.getProjectById(id as string)
      setProject(projectData)

      // Load tasks for this project
      const tasksData = await taskService.getTasksByProject(id as string)
      setTasks(tasksData)
    } catch (error) {
      console.error("Error loading project data:", error)
      showToast("Failed to load project data", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadProjectData()
  }

  // Filter tasks based on active filter
  const filteredTasks = activeFilter === "all" ? tasks : tasks.filter((task) => task.status === activeFilter)

  const handleAddTask = () => {
    // Navigate to add task screen
    router.push(`/add-task?projectId=${id}`)
  }

  const handleBack = () => {
    router.back()
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.projectName, { color: theme.text }]}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    )
  }

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.projectName, { color: theme.text }]}>Project not found</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Project not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.backToProjectsButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.backToProjectsText}>Back to Projects</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.projectName, { color: theme.text }]}>{project.name}</Text>
          <Text style={[styles.projectDescription, { color: theme.textDim }]}>{project.description}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.text }]}>Project Progress</Text>
          <View style={[styles.progressPercentageContainer, { backgroundColor: theme.tintLight }]}>
            <Text style={[styles.progressPercentage, { color: theme.tint }]}>{project.progress}%</Text>
          </View>
        </View>
        <ProgressBar progress={project.progress} />
      </View>

      <View style={styles.tasksHeader}>
        <Text style={[styles.tasksTitle, { color: theme.text }]}>Tasks</Text>
        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => setFilterVisible(!filterVisible)}
            activeOpacity={0.8}
          >
            <Ionicons name="filter-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: addButtonScale }] }}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.tint }]}
              onPress={handleAddTask}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {filterVisible && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              activeFilter === "all" && [styles.activeFilterOption, { backgroundColor: theme.tint }],
            ]}
            onPress={() => handleFilterChange("all")}
          >
            <Text
              style={
                activeFilter === "all"
                  ? styles.activeFilterOptionText
                  : [styles.filterOptionText, { color: theme.text }]
              }
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              activeFilter === "todo" && [styles.activeFilterOption, { backgroundColor: theme.tint }],
            ]}
            onPress={() => handleFilterChange("todo")}
          >
            <Text
              style={
                activeFilter === "todo"
                  ? styles.activeFilterOptionText
                  : [styles.filterOptionText, { color: theme.text }]
              }
            >
              To Do
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              activeFilter === "inProgress" && [styles.activeFilterOption, { backgroundColor: theme.tint }],
            ]}
            onPress={() => handleFilterChange("inProgress")}
          >
            <Text
              style={
                activeFilter === "inProgress"
                  ? styles.activeFilterOptionText
                  : [styles.filterOptionText, { color: theme.text }]
              }
            >
              In Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              activeFilter === "done" && [styles.activeFilterOption, { backgroundColor: theme.tint }],
            ]}
            onPress={() => handleFilterChange("done")}
          >
            <Text
              style={
                activeFilter === "done"
                  ? styles.activeFilterOptionText
                  : [styles.filterOptionText, { color: theme.text }]
              }
            >
              Done
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ScrollView style={styles.tasksList} refreshing={refreshing} onRefresh={handleRefresh}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} status={task.status as "todo" | "inProgress" | "done"} />
          ))
        ) : (
          <View style={styles.emptyTasksContainer}>
            <Ionicons name="list-outline" size={60} color={theme.textDim} />
            <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>
              No {activeFilter !== "all" ? activeFilter : ""} tasks found
            </Text>
            <Text style={[styles.emptyTasksSubtext, { color: theme.textDim }]}>
              Tap the "Add Task" button to create a new task
            </Text>
          </View>
        )}
      </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  projectName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  projectDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressPercentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tasksTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    padding: 10,
    marginRight: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
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
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  activeFilterOption: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterOptionText: {
    fontSize: 14,
  },
  activeFilterOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  tasksList: {
    flex: 1,
    padding: 16,
  },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyTasksText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  emptyTasksSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  backToProjectsButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backToProjectsText: {
    color: "#fff",
    fontWeight: "600",
  },
})
