import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import type { ReactNode } from "react"
import { useColorScheme } from "react-native"

import Colors from "@/constants/Colors"

interface InsightCardProps {
  insight: {
    id: string
    type: string
    title: string
    description: string
    icon: ReactNode
    timestamp: string
  }
}

export function InsightCard({ insight }: InsightCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

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

  const getCardStyle = () => {
    switch (insight.type) {
      case "suggestion":
        return styles.suggestionCard
      case "alert":
        return styles.alertCard
      case "productivity":
        return styles.productivityCard
      case "analytics":
        return styles.analyticsCard
      default:
        return {}
    }
  }

  const getBorderColor = () => {
    switch (insight.type) {
      case "suggestion":
        return "#4CAF50"
      case "alert":
        return "#FF9800"
      case "productivity":
        return "#2196F3"
      case "analytics":
        return "#9C27B0"
      default:
        return theme.border
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getCardStyle(),
        {
          backgroundColor: theme.cardBackground,
          borderLeftColor: getBorderColor(),
        },
      ]}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: "rgba(0, 0, 0, 0.05)" }]}>{insight.icon}</View>
        <Text style={[styles.timestamp, { color: theme.textDim }]}>{formatDate(insight.timestamp)}</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{insight.title}</Text>
      <Text style={[styles.description, { color: theme.textDim }]}>{insight.description}</Text>
      <View style={styles.footer}>
        <Text style={[styles.actionText, { color: theme.tint }]}>View Details</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.tint} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionCard: {
    borderLeftColor: "#4CAF50",
  },
  alertCard: {
    borderLeftColor: "#FF9800",
  },
  productivityCard: {
    borderLeftColor: "#2196F3",
  },
  analyticsCard: {
    borderLeftColor: "#9C27B0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },
})
