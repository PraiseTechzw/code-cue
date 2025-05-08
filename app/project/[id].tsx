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
  useColorScheme 
} from "react-native"
import { useState, useRef, useEffect } from "react"
import { useLocalSearchParams, router } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import Colors from "@/constants/Colors"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import type { Project } from "@/services/projectService"
import type { Task } from "@/services/taskService"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const [filterVisible, setFilterVisible] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const fetchProjectData = async () => {
    try {
      const [projectData, tasksData] = await Promise.all([
        projectService.getProjectById(id as string),
        taskService.getTasksByProject(id as string),
      ])
      setProject(projectData)
      setTasks(tasksData)
    } catch (error) {
      console.error("Error fetching project data:", error)
      showToast("Failed to load project data. Please try again.", "error")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProjectData()
  }, [id])

  // Filter tasks based on active filter
  const filteredTasks =
    activeFilter === "all" ? tasks : tasks.filter((task) => task.status === activeFilter)

  const handleAddTask = () => {
    router.push(`/add-task?projectId=${id}`)
  }

  const handleBack = () => {
    router.back()
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchProjectData()
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  if (!project) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.textDim} />
        <Text style={[styles.errorText, { color: theme.textDim }]}>Project not found</Text>
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

      <ScrollView 
        style={styles.tasksList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.tint}
          />
        }
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              status={task.status as "todo" | "inProgress" | "done"} 
            />
          ))
        ) : (
          <View style={styles.emptyTasksContainer}>
            <Ionicons name="list-outline" size={60} color={theme.textDim} />
            <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>
              No {activeFilter !== "all" ? activeFilter : ""} tasks found
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
    borderRadius: 12,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeFilterOption: {
    borderColor: "transparent",
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
    padding: 20,
    paddingTop: 10,
  },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTasksText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
  },
})
