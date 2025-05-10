"use client"

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"
import { useLocalSearchParams, router } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { VerifyAction } from "@/components/VerifyAction"
import Colors from "@/constants/Colors"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const [filterVisible, setFilterVisible] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    done: 0,
    total: 0,
  })

  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  // Animation for the add button
  const addButtonScale = useRef(new Animated.Value(1)).current
  const filterAnim = useRef(new Animated.Value(0)).current
  const headerAnim = useRef(new Animated.Value(0)).current

  // Animate header on mount
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  // Animate filter container
  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: filterVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [filterVisible])

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const online = await projectService.isOnline()
      setIsOffline(!online)
    }

    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

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

      // Calculate task statistics
      const todo = tasksData.filter((task) => task.status === "todo").length
      const inProgress = tasksData.filter((task) => task.status === "inProgress").length
      const done = tasksData.filter((task) => task.status === "done").length

      setTaskStats({
        todo,
        inProgress,
        done,
        total: tasksData.length,
      })
    } catch (error) {
      console.error("Error loading project data:", error)
      showToast("Failed to load project data",  { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadProjectData()
  }, [id])

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
    Haptics.selectionAsync()
  }

  const handleEditProject = () => {
    // Navigate to edit project screen
    router.push(`/edit-project/${id}`)
  }

  const handleDeleteProject = async () => {
    try {
      await projectService.deleteProject(id as string)
      showToast("Project deleted successfully",{type: 'success'})
      router.replace("/projects")
    } catch (error) {
      console.error("Error deleting project:", error)
      showToast("Failed to delete project",  { type: "error" })
    }
  }

  const handleShowOptions = () => {
    Alert.alert("Project Options", "What would you like to do?", [
      {
        text: "Edit Project",
        onPress: handleEditProject,
      },
      {
        text: "Delete Project",
        onPress: () => setShowDeleteConfirm(true),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ])
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
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.tintLight }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
          <Text style={[styles.offlineText, { color: theme.tint }]}>You're offline. Some features may be limited.</Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.projectName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {project.name}
          </Text>
          <Text style={[styles.projectDescription, { color: theme.textDim }]} numberOfLines={2} ellipsizeMode="tail">
            {project.description || "No description provided"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleShowOptions}
          style={styles.optionsButton}
          accessibilityRole="button"
          accessibilityLabel="Project options"
        >
          <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.text }]}>Project Progress</Text>
          <View style={[styles.progressPercentageContainer, { backgroundColor: theme.tintLight }]}>
            <Text style={[styles.progressPercentage, { color: theme.tint }]}>{project.progress || 0}%</Text>
          </View>
        </View>
        <ProgressBar progress={typeof project.progress === 'number' ? project.progress : 0} />

        <View style={styles.statsContainer}>
          <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="list-outline" size={20} color="#2196F3" />
            <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.todo}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>To Do</Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="time-outline" size={20} color="#FF9800" />
            <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>In Progress</Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.done}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
          </View>
        </View>
      </View>

      <View style={styles.tasksHeader}>
        <Text style={[styles.tasksTitle, { color: theme.text }]}>Tasks</Text>
        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => setFilterVisible(!filterVisible)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Filter tasks"
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
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.filterContainer,
          {
            opacity: filterAnim,
            height: filterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 50],
            }),
            overflow: "hidden",
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterOption,
              activeFilter === "all" && [styles.activeFilterOption, { backgroundColor: theme.tint }],
            ]}
            onPress={() => handleFilterChange("all")}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === "all" }}
            accessibilityLabel="Show all tasks"
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
              activeFilter === "todo" && [styles.activeFilterOption, { backgroundColor: "#2196F3" }],
            ]}
            onPress={() => handleFilterChange("todo")}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === "todo" }}
            accessibilityLabel="Show to do tasks"
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
              activeFilter === "inProgress" && [styles.activeFilterOption, { backgroundColor: "#FF9800" }],
            ]}
            onPress={() => handleFilterChange("inProgress")}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === "inProgress" }}
            accessibilityLabel="Show in progress tasks"
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
              activeFilter === "done" && [styles.activeFilterOption, { backgroundColor: "#4CAF50" }],
            ]}
            onPress={() => handleFilterChange("done")}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === "done" }}
            accessibilityLabel="Show completed tasks"
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
      </Animated.View>

      <ScrollView
        style={styles.tasksList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.tint]} />}
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={{
                id: task.id,
                title: task.title,
                due_date: task.due_date,
                priority: task.priority
              }} 
              status={task.status as "todo" | "inProgress" | "done"} 
            />
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

      <VerifyAction
        visible={showDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone and all associated tasks will be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive={true}
      />

      <ConnectionStatus />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  optionsButton: {
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
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statItem: {
    width: "30%",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
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
  },
  filterScrollContent: {
    paddingVertical: 12,
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
