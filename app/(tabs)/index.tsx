"use client"

import { StyleSheet, ScrollView, View, Text, Pressable, Animated } from "react-native"
import { useState, useRef } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"

import { ProgressBar } from "@/components/ProgressBar"
import { TaskItem } from "@/components/TaskItem"
import Colors from "@/constants/Colors"
import { useColorScheme } from "react-native"

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [expandedSections, setExpandedSections] = useState({
    todo: true,
    inProgress: true,
    done: false,
  })

  // Animation values for section toggles
  const todoRotation = useRef(new Animated.Value(expandedSections.todo ? 1 : 0)).current
  const inProgressRotation = useRef(new Animated.Value(expandedSections.inProgress ? 1 : 0)).current
  const doneRotation = useRef(new Animated.Value(expandedSections.done ? 1 : 0)).current

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

  // Mock data for current project
  const currentProject = {
    id: "1",
    name: "Code Cue",
    description: "AI-powered developer assistant",
    progress: 68,
    tasks: {
      todo: [
        { id: "1", title: "Implement user settings", dueDate: "2025-05-15", priority: "High" },
        { id: "2", title: "Add dark mode support", dueDate: "2025-05-20", priority: "Medium" },
      ],
      inProgress: [
        { id: "3", title: "GitHub integration", dueDate: "2025-05-10", priority: "High" },
        { id: "4", title: "Notification system", dueDate: "2025-05-12", priority: "Medium" },
      ],
      done: [
        { id: "5", title: "Project setup", dueDate: "2025-05-01", priority: "High" },
        { id: "6", title: "Basic UI components", dueDate: "2025-05-03", priority: "High" },
        { id: "7", title: "Navigation structure", dueDate: "2025-05-05", priority: "Medium" },
        { id: "8", title: "Authentication flow", dueDate: "2025-05-07", priority: "High" },
      ],
    },
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
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
                <Text style={[styles.taskCountText, { color: theme.tint }]}>{currentProject.tasks.todo.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: todoRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.todo && (
            <View>
              {currentProject.tasks.todo.map((task) => (
                <TaskItem key={task.id} task={task} status="todo" />
              ))}
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
                <Text style={[styles.taskCountText, { color: theme.tint }]}>
                  {currentProject.tasks.inProgress.length}
                </Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: inProgressRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.inProgress && (
            <View>
              {currentProject.tasks.inProgress.map((task) => (
                <TaskItem key={task.id} task={task} status="inProgress" />
              ))}
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
                <Text style={[styles.taskCountText, { color: theme.tint }]}>{currentProject.tasks.done.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: doneRotateZ }] }}>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Animated.View>
          </Pressable>

          {expandedSections.done && (
            <View>
              {currentProject.tasks.done.map((task) => (
                <TaskItem key={task.id} task={task} status="done" />
              ))}
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
})
