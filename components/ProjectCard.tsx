"use client"

import { View, Text, StyleSheet, Animated, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useRef, useEffect } from "react"
import { useColorScheme } from "react-native"

import { ProgressBar } from "./ProgressBar"
import Colors from "@/constants/Colors"
import type { Project } from "@/services/projectService"

interface ProjectCardProps {
  project: Project
  onPress?: () => void
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "#4CAF50" // Green
    if (progress >= 50) return "#2196F3" // Blue
    if (progress >= 25) return "#FFC107" // Yellow
    return "#F44336" // Red
  }

  const getStatusIcon = (progress: number) => {
    if (progress === 100) return "checkmark-circle"
    if (progress >= 75) return "checkmark-circle-outline"
    if (progress >= 50) return "time"
    if (progress >= 25) return "hourglass-outline"
    return "alert-circle-outline"
  }

  return (
    <Animated.View style={{ opacity: opacityAnim }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: theme.cardBackground },
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons
              name={getStatusIcon(project.progress)}
              size={20}
              color={getProgressColor(project.progress)}
              style={styles.statusIcon}
            />
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {project.name}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={14} color={theme.textDim} />
            <Text style={[styles.date, { color: theme.textDim }]}>
              {formatDate(project.updated_at)}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.textDim }]} numberOfLines={2}>
          {project.description || "No description"}
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressText, { color: theme.textDim }]}>Progress</Text>
            <Text style={[styles.progressPercentage, { color: getProgressColor(project.progress) }]}>
              {project.progress}%
            </Text>
          </View>
          <ProgressBar progress={project.progress} color={getProgressColor(project.progress)} />
        </View>

        <View style={styles.footer}>
          <View style={styles.dateRange}>
            {project.start_date && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.textDim} />
                <Text style={[styles.dateText, { color: theme.textDim }]}>
                  {new Date(project.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            )}
            {project.end_date && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar" size={14} color={theme.textDim} />
                <Text style={[styles.dateText, { color: theme.textDim }]}>
                  {new Date(project.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  statusIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    paddingTop: 12,
  },
  dateRange: {
    flexDirection: "row",
    gap: 12,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
})
