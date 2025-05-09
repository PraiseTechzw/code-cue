"use client"

import { View, Text, StyleSheet, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useRef } from "react"
import { useColorScheme } from "react-native"

import { ProgressBar } from "./ProgressBar"
import Colors from "@/constants/Colors"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    progress: number
    lastUpdated: string
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  // Animation for card hover effect
  const scaleAnim = useRef(new Animated.Value(1)).current

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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          shadowColor: theme.text,
        },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.text }]}>{project.name}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </View>
        <Text style={[styles.description, { color: theme.textDim }]}>{project.description}</Text>

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
        </View>
      </View>
    </Animated.View>
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
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
})
