"use client"

import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef } from "react"
import { useColorScheme } from "react-native"

import Colors from "@/constants/Colors"
import type { Task } from "@/services/taskService"

interface TaskProps {
  task: Task
  status: "todo" | "inProgress" | "done"
}

export function TaskItem({ task, status }: TaskProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  // Animation for task press
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getStatusIcon = () => {
    switch (status) {
      case "todo":
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
      case "inProgress":
        return <Ionicons name="time-outline" size={20} color="#FF9800" />
      case "done":
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      default:
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
    }
  }

  const getPriorityColor = () => {
    switch (task.priority) {
      case "High":
        return "#F44336"
      case "Medium":
        return "#FF9800"
      case "Low":
        return "#4CAF50"
      default:
        return "#757575"
    }
  }

  const handleTaskPress = () => {
    router.push(`/task/${task.id}`)
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.cardBackground }, status === "done" && styles.completedTask]}
        onPress={handleTaskPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.leftSection}>
          {getStatusIcon()}
          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.title,
                { color: theme.text },
                status === "done" && [styles.completedTitle, { color: theme.textDim }],
              ]}
            >
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              <View style={styles.dueDateContainer}>
                <Ionicons name="calendar-outline" size={12} color={theme.textDim} style={styles.calendarIcon} />
                <Text style={[styles.dueDate, { color: theme.textDim }]}>Due {formatDate(task.due_date)}</Text>
              </View>
              <View style={[styles.priorityTag, { backgroundColor: getPriorityColor() }]}>
                <Text style={styles.priorityText}>{task.priority}</Text>
              </View>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completedTask: {
    opacity: 0.7,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskInfo: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 6,
  },
  completedTitle: {
    textDecorationLine: "line-through",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  calendarIcon: {
    marginRight: 4,
  },
  dueDate: {
    fontSize: 12,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
})
