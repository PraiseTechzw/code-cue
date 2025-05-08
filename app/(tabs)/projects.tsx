"use client"

import { StyleSheet, View, Text, FlatList, Pressable, TouchableOpacity, Animated } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef } from "react"
import { useColorScheme } from "react-native"

import { ProjectCard } from "@/components/ProjectCard"
import Colors from "@/constants/Colors"

export default function ProjectsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  // Animation for the add button
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  // Mock data for projects
  const projects = [
    {
      id: "1",
      name: "Code Cue",
      description: "AI-powered developer assistant",
      progress: 68,
      lastUpdated: "2025-05-08T14:30:00Z",
    },
    {
      id: "2",
      name: "DevTracker",
      description: "Time tracking for developers",
      progress: 42,
      lastUpdated: "2025-05-07T09:15:00Z",
    },
    {
      id: "3",
      name: "GitFlow",
      description: "Git workflow visualization",
      progress: 89,
      lastUpdated: "2025-05-06T16:45:00Z",
    },
    {
      id: "4",
      name: "CodeReview",
      description: "Automated code review tool",
      progress: 23,
      lastUpdated: "2025-05-05T11:20:00Z",
    },
  ]

  const handleProjectPress = (projectId: string) => {
    // Navigate to project details
    router.push(`/project/${projectId}`)
  }

  const handleNewProject = () => {
    // Navigate to new project screen
    router.push("/new-project")
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Projects</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: theme.tint }]}
            onPress={handleNewProject}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newButtonText}>New Project</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleProjectPress(item.id)}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <ProjectCard project={item} />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  newButton: {
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
  newButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
})
