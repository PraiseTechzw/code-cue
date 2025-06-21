"use client"

import { View, Text, StyleSheet, Animated, Pressable, Alert } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useRef, useState, useEffect } from "react"
import { useColorScheme } from "react-native"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"

import { ProgressBar } from "./ProgressBar"
import Colors from "@/constants/Colors"
import type { Phase } from "@/types/appwrite"
import { useToast } from "@/contexts/ToastContext"
import { phaseService } from "@/services/phaseService"
import { taskService } from "@/services/taskService"

interface PhaseCardProps {
  phase: Phase
  onPress?: (phase: Phase) => void
  onLongPress?: (phase: Phase) => void
  showTasks?: boolean
}

export function PhaseCard({ phase, onPress, onLongPress, showTasks = true }: PhaseCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [isPressed, setIsPressed] = useState(false)
  const { showToast } = useToast()

  // Animation for card hover effect
  const scaleAnim = useRef(new Animated.Value(1)).current
  const shadowAnim = useRef(new Animated.Value(0)).current

  // Task statistics
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
  })

  // Fetch task data for this phase
  useEffect(() => {
    const fetchTaskStats = async () => {
      try {
        const tasks = await taskService.getTasks({ projectId: phase.project_id, phaseId: phase.$id })
        const total = tasks.length
        const completed = tasks.filter(task => task.status === 'done').length
        const inProgress = tasks.filter(task => task.status === 'inProgress').length
        const todo = tasks.filter(task => task.status === 'todo').length
        
        setTaskStats({
          total,
          completed,
          inProgress,
          todo
        })
      } catch (error) {
        console.error('Error fetching task stats:', error)
      }
    }

    if (showTasks) {
      fetchTaskStats()
    }
  }, [phase.$id, phase.project_id, showTasks])

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
      onPress(phase)
    } else {
      router.push(`/phase/${phase.$id}`)
    }
  }

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      "Phase Options",
      `What would you like to do with "${phase.name}"?`,
      [
        {
          text: "Edit Phase",
          onPress: () => router.push(`/edit-phase/${phase.$id}`),
        },
        {
          text: "Add Task",
          onPress: () => router.push(`/add-task?projectId=${phase.project_id}&phaseId=${phase.$id}`),
        },
        {
          text: "Delete Phase",
          onPress: async () => {
            try {
              await phaseService.deletePhase(phase.$id)
              showToast("Phase deleted successfully", { type: "success" })
              // Refresh the project
              router.replace(`/project/${phase.project_id}`)
            } catch (error) {
              console.error("Error deleting phase:", error)
              showToast("Failed to delete phase", { type: "error" })
            }
          },
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    )
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50'
      case 'in-progress':
        return '#FF9800'
      case 'on-hold':
        return '#F44336'
      case 'not-started':
        return '#9E9E9E'
      default:
        return theme.textDim
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'in-progress':
        return 'play-circle'
      case 'on-hold':
        return 'pause-circle'
      case 'not-started':
        return 'ellipse-outline'
      default:
        return 'ellipse-outline'
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
      accessibilityLabel={`Phase: ${phase.name}, ${phase.progress}% complete`}
      accessibilityHint="Double tap to view phase details"
      style={{ marginBottom: 12 }}
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
            <View style={styles.headerLeft}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {phase.name}
              </Text>
              <View style={[styles.orderBadge, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.orderText, { color: theme.tint }]}>
                  {phase.order}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(phase.status) }]}>
                <Ionicons name={getStatusIcon(phase.status) as any} size={12} color="#fff" />
                <Text style={styles.statusText}>
                  {phase.status.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </View>
          </View>

          {phase.description && (
            <Text style={[styles.description, { color: theme.textDim }]} numberOfLines={2} ellipsizeMode="tail">
              {phase.description}
            </Text>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: theme.textDim }]}>
                {phase.progress}% complete
              </Text>
              <Text style={[styles.weightText, { color: theme.textDim }]}>
                {phase.weight}% weight
              </Text>
            </View>
            <ProgressBar progress={phase.progress} />
          </View>

          {showTasks && (
            <View style={styles.taskStats}>
              <View style={styles.taskStat}>
                <Ionicons name="list-outline" size={14} color="#2196F3" />
                <Text style={[styles.taskStatText, { color: theme.textDim }]}>
                  {taskStats.total} total
                </Text>
              </View>
              <View style={styles.taskStat}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#4CAF50" />
                <Text style={[styles.taskStatText, { color: theme.textDim }]}>
                  {taskStats.completed} done
                </Text>
              </View>
              <View style={styles.taskStat}>
                <Ionicons name="time-outline" size={14} color="#FF9800" />
                <Text style={[styles.taskStatText, { color: theme.textDim }]}>
                  {taskStats.inProgress} in progress
                </Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={theme.textDim} />
              <Text style={[styles.dateText, { color: theme.textDim }]}>
                {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
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
    borderRadius: 12,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  orderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  orderText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  weightText: {
    fontSize: 12,
    fontWeight: "500",
  },
  taskStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
  },
  taskStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskStatText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
}) 