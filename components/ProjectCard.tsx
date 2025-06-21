"use client"

import { View, Text, StyleSheet, Animated, Pressable, Alert } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useRef, useState, useEffect } from "react"
import { useColorScheme } from "react-native"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"

import { ProgressBar } from "./ProgressBar"
import Colors from "@/constants/Colors"
import type { Project } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"

interface ProjectCardProps {
  project: Project
  onPress?: (project: Project) => void
  onLongPress?: (project: Project) => void
}

export function ProjectCard({ project, onPress, onLongPress }: ProjectCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [isPressed, setIsPressed] = useState(false)
  const { showToast } = useToast()

  // Animation for card hover effect
  const scaleAnim = useRef(new Animated.Value(1)).current
  const shadowAnim = useRef(new Animated.Value(0)).current

  // Format the date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date"

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      return "Just now"
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else if (diffHours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  // Calculate task statistics
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
  })

  // Fetch real task data
  useEffect(() => {
    const fetchTaskStats = async () => {
      try {
        const projectId = project.$id
        if (!projectId) {
          console.warn('Project has no valid ID:', project)
          return
        }
        
        const tasks = await taskService.getTasksByProject(projectId)
        const total = tasks.length
        const completed = tasks.filter(task => task.status === 'done').length
        
        setTaskStats({
          total,
          completed
        })
      } catch (error) {
        console.error('Error fetching task stats:', error)
      }
    }

    fetchTaskStats()
  }, [project.$id])

  const handlePressIn = () => {
    setIsPressed(true)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    setIsPressed(false)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onPress) {
      onPress(project)
    } else {
      const projectId = project.$id
      if (!projectId) {
        console.error('Project has no valid ID:', project)
        return
      }
      router.push(`/project/${projectId}`)
    }
  }

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${project.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const projectId = project.$id
              if (!projectId) {
                console.error('Project has no valid ID:', project)
                return
              }
              await projectService.deleteProject(projectId)
              showToast("Project deleted successfully", { type: "success" })
              // Refresh the projects list
              router.replace("/")
            } catch (error) {
              console.error("Error deleting project:", error)
              showToast("Failed to delete project", { type: "error" })
            }
          }
        }
      ]
    )
  }

  // Interpolate shadow values for animation
  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.2],
  })

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 8],
  })

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Project: ${project.name}, ${project.progress}% complete`}
      accessibilityHint="Double tap to view project details"
      style={{ marginBottom: 16 }}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.cardBackground,
            shadowColor: theme.text,
            shadowOpacity,
            shadowRadius,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
              {project.name}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </View>
          <Text style={[styles.description, { color: theme.textDim }]} numberOfLines={2} ellipsizeMode="tail">
            {project.description || "No description provided"}
          </Text>

          <View style={styles.progressContainer}>
            <ProgressBar progress={taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0} />
            <View style={styles.progressTextContainer}>
              <Text style={[styles.progressText, { color: theme.textDim }]}>
                {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}% complete
              </Text>
              <Text style={[styles.taskCount, { color: theme.textDim }]}>
                {taskStats.completed}/{taskStats.total} tasks
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.lastUpdatedContainer}>
              <Ionicons name="time-outline" size={14} color={theme.textDim} style={styles.timeIcon} />
              <Text style={[styles.lastUpdated, { color: theme.textDim }]}>
                Updated {formatDate(project.$updatedAt)}
              </Text>
            </View>

            {/* Status indicator */}
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: project.progress >= 100 ? "#4CAF50" : project.progress > 0 ? "#FF9800" : "#2196F3" },
              ]}
            >
              <Text style={styles.statusText}>
                {project.progress >= 100 ? "Completed" : project.progress > 0 ? "In Progress" : "New"}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
  },
  taskCount: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastUpdatedContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeIcon: {
    marginRight: 4,
  },
  lastUpdated: {
    fontSize: 12,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
})
