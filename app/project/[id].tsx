"use client"

import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from "react-native"
import { useState, useRef } from "react"
import { useLocalSearchParams, router } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import Colors from "@/constants/Colors"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const [filterVisible, setFilterVisible] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")

  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

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

  // Mock project data based on ID
  const project = {
    id: id as string,
    name: "Code Cue",
    description: "AI-powered developer assistant",
    progress: 68,
    tasks: [
      { id: "1", title: "Implement user settings", dueDate: "2025-05-15", priority: "High", status: "todo" },
      { id: "2", title: "Add dark mode support", dueDate: "2025-05-20", priority: "Medium", status: "todo" },
      { id: "3", title: "GitHub integration", dueDate: "2025-05-10", priority: "High", status: "inProgress" },
      { id: "4", title: "Notification system", dueDate: "2025-05-12", priority: "Medium", status: "inProgress" },
      { id: "5", title: "Project setup", dueDate: "2025-05-01", priority: "High", status: "done" },
      { id: "6", title: "Basic UI components", dueDate: "2025-05-03", priority: "High", status: "done" },
      { id: "7", title: "Navigation structure", dueDate: "2025-05-05", priority: "Medium", status: "done" },
      { id: "8", title: "Authentication flow", dueDate: "2025-05-07", priority: "High", status: "done" },
    ],
  }

  // Filter tasks based on active filter
  const filteredTasks =
    activeFilter === "all" ? project.tasks : project.tasks.filter((task) => task.status === activeFilter)

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

      <ScrollView style={styles.tasksList}>
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
  },
})
