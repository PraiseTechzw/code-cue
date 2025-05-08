"use client"

import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useRef, useState } from "react"
import { useColorScheme } from "react-native"

import { InsightCard } from "@/components/InsightCard"
import Colors from "@/constants/Colors"

export default function InsightsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [activeFilter, setActiveFilter] = useState("all")

  // Animation for filter buttons
  const filterButtonScale = useRef(new Animated.Value(1)).current

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

  // Mock data for AI insights
  const insights = [
    {
      id: "1",
      type: "suggestion",
      title: "Next Steps",
      description:
        "Based on your recent commits, consider implementing user settings next to complete the profile section.",
      icon: <Ionicons name="trending-up" size={24} color="#4CAF50" />,
      timestamp: "2025-05-08T14:30:00Z",
    },
    {
      id: "2",
      type: "alert",
      title: "Unfinished Task",
      description:
        'The "GitHub integration" task is marked as in progress for 5 days. Consider breaking it down into smaller tasks.',
      icon: <Ionicons name="warning-outline" size={24} color="#FF9800" />,
      timestamp: "2025-05-08T12:15:00Z",
    },
    {
      id: "3",
      type: "productivity",
      title: "Productivity Tip",
      description:
        "You complete most tasks in the morning. Consider scheduling complex tasks before noon for optimal productivity.",
      icon: <Ionicons name="time-outline" size={24} color="#2196F3" />,
      timestamp: "2025-05-07T16:45:00Z",
    },
    {
      id: "4",
      type: "suggestion",
      title: "Code Optimization",
      description:
        "Several components in the UI folder could be refactored to reduce duplication. Estimated time saving: 2 hours.",
      icon: <Ionicons name="flash-outline" size={24} color="#9C27B0" />,
      timestamp: "2025-05-07T10:20:00Z",
    },
    {
      id: "5",
      type: "analytics",
      title: "Weekly Summary",
      description: "You completed 12 tasks this week, a 20% increase from last week. Great progress!",
      icon: <Ionicons name="stats-chart-outline" size={24} color="#2196F3" />,
      timestamp: "2025-05-06T15:10:00Z",
    },
  ]

  // Filter insights based on active filter
  const filteredInsights =
    activeFilter === "all" ? insights : insights.filter((insight) => insight.type === activeFilter)

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
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
        {filteredInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
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
})
