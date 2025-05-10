"use client"

import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useRef, useState, useEffect } from "react"
import { useColorScheme } from "react-native"

import { InsightCard } from "@/components/InsightCard"
import { aiService } from "@/services/aiService"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function InsightsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [activeFilter, setActiveFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<any[]>([])

  // Animation for filter buttons
  const filterButtonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      setLoading(true)

      // Get projects and tasks to generate insights
      const projects = await projectService.getProjects()

      // Get tasks for all projects
      let allTasks: any[] = []
      for (const project of projects) {
        const tasks = await taskService.getTasksByProject(project.id)
        allTasks = [...allTasks, ...tasks]
      }

      // Generate AI insights
      const insightsData = await aiService.generateInsights(projects, allTasks)
      setInsights(insightsData)
    } catch (error) {
      console.error("Error loading insights:", error)
      showToast("Failed to load insights", "error")

      // Use fallback insights
      const fallbackInsights = aiService.getFallbackInsights()
      setInsights(fallbackInsights)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterPress = (filter: string) => {
    setActiveFilter(filter)
  }

  const handlePressIn = () => {
    Animated.spring(filterButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(filterButtonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  // Filter insights based on active filter
  const filteredInsights =
    activeFilter === "all" ? insights : insights.filter((insight) => insight.type === activeFilter)

  // Get icon for insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "suggestion":
        return <Ionicons name="trending-up" size={24} color="#4CAF50" />
      case "alert":
        return <Ionicons name="warning-outline" size={24} color="#FF9800" />
      case "productivity":
        return <Ionicons name="time-outline" size={24} color="#2196F3" />
      case "analytics":
        return <Ionicons name="stats-chart-outline" size={24} color="#9C27B0" />
      default:
        return <Ionicons name="bulb-outline" size={24} color="#2196F3" />
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshing={loading}
      onRefresh={loadInsights}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>AI Insights</Text>
        <Text style={[styles.subtitle, { color: theme.textDim }]}>Smart recommendations based on your activity</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "all" && [styles.activeFilter, { backgroundColor: theme.tint }],
          ]}
          onPress={() => handleFilterPress("all")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.filterText, activeFilter === "all" ? styles.activeFilterText : { color: theme.textDim }]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "suggestion" && [styles.activeFilter, { backgroundColor: theme.tint }],
          ]}
          onPress={() => handleFilterPress("suggestion")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === "suggestion" ? styles.activeFilterText : { color: theme.textDim },
            ]}
          >
            Suggestions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "alert" && [styles.activeFilter, { backgroundColor: theme.tint }],
          ]}
          onPress={() => handleFilterPress("alert")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.filterText, activeFilter === "alert" ? styles.activeFilterText : { color: theme.textDim }]}
          >
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "productivity" && [styles.activeFilter, { backgroundColor: theme.tint }],
          ]}
          onPress={() => handleFilterPress("productivity")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === "productivity" ? styles.activeFilterText : { color: theme.textDim },
            ]}
          >
            Tips
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "analytics" && [styles.activeFilter, { backgroundColor: theme.tint }],
          ]}
          onPress={() => handleFilterPress("analytics")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === "analytics" ? styles.activeFilterText : { color: theme.textDim },
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.insightsContainer}>
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={{
                ...insight,
                icon: getInsightIcon(insight.type),
              }}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="bulb-outline" size={60} color={theme.textDim} />
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              No {activeFilter !== "all" ? activeFilter : ""} insights available
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  activeFilter: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    fontWeight: "500",
    fontSize: 14,
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "600",
  },
  insightsContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
})
