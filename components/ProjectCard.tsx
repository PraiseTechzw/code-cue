"use client"

import { View, Text, StyleSheet, Animated, TouchableOpacity, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useRef, useState } from "react"
import { useColorScheme } from "react-native"
import { useRouter } from "expo-router"

import { ProgressBar } from "./ProgressBar"
import Colors from "@/constants/Colors"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    progress: number
    lastUpdated: string
    totalTasks?: number
    completedTasks?: number
    dueSoon?: number
    members?: Array<{
      id: string
      name: string
      avatar?: string
    }>
    priority?: "low" | "medium" | "high"
  }
  onPress?: () => void
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [isPressed, setIsPressed] = useState(false)

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current
  const pressAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    setIsPressed(true)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    setIsPressed(false)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePress = () => {
    onPress?.() || router.push(`/project/${project.id}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      return "Just now"
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return theme.error
      case "medium":
        return theme.warning
      case "low":
        return theme.success
      default:
        return theme.textDim
    }
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.cardBackground,
            shadowColor: theme.text,
            transform: [{ scale: scaleAnim }],
          },
          isPressed && styles.pressed,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.name, { color: theme.text }]}>{project.name}</Text>
              {project.priority && (
                <View
                  style={[styles.priorityBadge, { backgroundColor: getPriorityColor(project.priority) + "20" }]}
                >
                  <Text style={[styles.priorityText, { color: getPriorityColor(project.priority) }]}>
                    {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </View>

          <Text style={[styles.description, { color: theme.textDim }]} numberOfLines={2}>
            {project.description}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="checkbox-outline" size={16} color={theme.textDim} />
              <Text style={[styles.statText, { color: theme.textDim }]}>
                {project.completedTasks || 0}/{project.totalTasks || 0} Tasks
              </Text>
            </View>
            {project.dueSoon ? (
              <View style={styles.stat}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.warning} />
                <Text style={[styles.statText, { color: theme.warning }]}>{project.dueSoon} Due Soon</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar progress={project.progress} />
            <Text style={[styles.progressText, { color: theme.textDim }]}>{project.progress}% complete</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.lastUpdatedContainer}>
              <Ionicons name="time-outline" size={14} color={theme.textDim} style={styles.timeIcon} />
              <Text style={[styles.lastUpdated, { color: theme.textDim }]}>
                Updated {formatDate(project.lastUpdated)}
              </Text>
            </View>

            {project.members && project.members.length > 0 && (
              <View style={styles.membersContainer}>
                {project.members.slice(0, 3).map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: theme.tintLight },
                      { marginLeft: index > 0 ? -8 : 0 },
                    ]}
                  >
                    <Text style={[styles.memberInitial, { color: theme.tint }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ))}
                {project.members.length > 3 && (
                  <View style={[styles.memberAvatar, { backgroundColor: theme.tintLight, marginLeft: -8 }]}>
                    <Text style={[styles.memberInitial, { color: theme.tint }]}>+{project.members.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
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
  membersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  memberInitial: {
    fontSize: 10,
    fontWeight: "600",
  },
})
