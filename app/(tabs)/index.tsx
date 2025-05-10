"use client"

import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native"
import { useState, useRef, useEffect } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"

import { ProgressBar } from "@/components/ProgressBar"
import { TaskItem } from "@/components/TaskItem"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [expandedSections, setExpandedSections] = useState({
    todo: true,
    inProgress: true,
    done: false,
  })

  const [loading, setLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any>({
    todo: [],
    inProgress: [],
    done: [],
  })

  // Animation values for section toggles
  const todoRotation = useRef(new Animated.Value(expandedSections.todo ? 1 : 0)).current
  const inProgressRotation = useRef(new Animated.Value(expandedSections.inProgress ? 1 : 0)).current
  const doneRotation = useRef(new Animated.Value(expandedSections.done ? 1 : 0)).current

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get all projects
      const projects = await projectService.getProjects()

      // Use the most recently updated project as the current project
      if (projects && projects.length > 0) {
        const sortedProjects = [...projects].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )

        const project = sortedProjects[0]
        setCurrentProject(project)

        // Get tasks for this project
        const projectTasks = await taskService.getTasksByProject(project.id)

        // Organize tasks by status
        const todoTasks = projectTasks.filter((task) => task.status === "todo")
        const inProgressTasks = projectTasks.filter((task) => task.status === "inProgress")
        const doneTasks = projectTasks.filter((task) => task.status === "done")

        setTasks({
          todo: todoTasks,
          inProgress: inProgressTasks,
          done: doneTasks,
        })
      }
    } catch (error) {
      console.error("Error loading home data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    const newValue = !expandedSections[section]
    setExpandedSections({
      ...expandedSections,
      [section]: newValue,
    })

    // Animate the chevron rotation
    const rotationValue =
      section === "todo" ? todoRotation : section === "inProgress" ? inProgressRotation : doneRotation

    Animated.timing(rotationValue, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  // Calculate rotation for each section
  const todoRotateZ = todoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const inProgressRotateZ = inProgressRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const doneRotateZ = doneRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const handleTaskPress = (taskId: string) => {
    router.push(`/task/${taskId}`)
  }

  const handleProjectPress = () => {
    if (currentProject) {
      router.push(`/project/${currentProject.id}`)
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.text }]}>No projects yet</Text>
        <Text style={[styles.emptySubtext, { color: theme.textDim }]}>Create your first project to get started</Text>
        <TouchableOpacity
          style={[styles.createProjectButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push("/new-project")}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createProjectButtonText}>Create Project</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshing={loading}
      onRefresh={loadData}
    >
      <Pressable onPress={handleProjectPress}>
        <View style={styles.header}>
          <Text style={[styles.projectName, { color: theme.text }]}>{currentProject.name}</Text>
          <Text style={[styles.projectDescription, { color: theme.textDim }]}>{currentProject.description}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Project Progress</Text>
            <View style={[styles.progressPercentageContainer, { backgroundColor: theme.tintLight }]}>
              <Text style={[styles.progressPercentage, { color: theme.tint }]}>{currentProject.progress}%</Text>
            </View>
          </View>
          <ProgressBar progress={currentProject.progress} />
        </View>
      </Pressable>

      <View style={styles.milestones}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Milestones</Text>

        {/* To Do Section */}
        <View style={[styles.taskSection, { backgroundColor: theme.cardBackground }]}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection("todo")}
            android_ripple={{ color: theme.ripple }}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="ellipse-outline" size={20} color={theme.text} />
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>To Do</Text>
              <View style={[styles.taskCount, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.taskCountText, { color: theme.tint }]}>{tasks.todo.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: todoRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.todo && (
            <View>
              {tasks.todo.length > 0 ? (
                tasks.todo.map((task: any) => (
                  <TaskItem
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      dueDate: task.due_date || new Date().toISOString(),
                      priority: task.priority,
                    }}
                    status="todo"
                  />
                ))
              ) : (
                <View style={styles.emptyTasksContainer}>
                  <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>No tasks to do</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* In Progress Section */}
        <View style={[styles.taskSection, { backgroundColor: theme.cardBackground }]}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection("inProgress")}
            android_ripple={{ color: theme.ripple }}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>In Progress</Text>
              <View style={[styles.taskCount, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.taskCountText, { color: theme.tint }]}>{tasks.inProgress.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: inProgressRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.inProgress && (
            <View>
              {tasks.inProgress.length > 0 ? (
                tasks.inProgress.map((task: any) => (
                  <TaskItem
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      dueDate: task.due_date || new Date().toISOString(),
                      priority: task.priority,
                    }}
                    status="inProgress"
                  />
                ))
              ) : (
                <View style={styles.emptyTasksContainer}>
                  <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>No tasks in progress</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Done Section */}
        <View style={[styles.taskSection, { backgroundColor: theme.cardBackground }]}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection("done")}
            android_ripple={{ color: theme.ripple }}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Done</Text>
              <View style={[styles.taskCount, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.taskCountText, { color: theme.tint }]}>{tasks.done.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: doneRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.done && (
            <View>
              {tasks.done.length > 0 ? (
                tasks.done.map((task: any) => (
                  <TaskItem
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      dueDate: task.due_date || new Date().toISOString(),
                      priority: task.priority,
                    }}
                    status="done"
                  />
                ))
              ) : (
                <View style={styles.emptyTasksContainer}>
                  <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>No completed tasks</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 20,
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
  createProjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createProjectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  projectName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 16,
    marginTop: 4,
  },
  progressContainer: {
    padding: 20,
    paddingTop: 0,
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
  milestones: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  taskSection: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  taskCount: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyTasksContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyTasksText: {
    fontSize: 14,
    fontStyle: "italic",
  },
})
