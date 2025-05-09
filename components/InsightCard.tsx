import { StyleSheet, View, Text } from "react-native"
import type { ReactNode } from "react"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface InsightCardProps {
  insight: {
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    icon: ReactNode
  }
}

export function InsightCard({ insight }: InsightCardProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const getTypeColor = () => {
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
        return theme.tint
    }
  }

  const formatTime = (dateString: string) => {
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
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderLeftColor: getTypeColor() }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>{insight.icon}</View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{insight.title}</Text>
          <Text style={[styles.time, { color: theme.textDim }]}>{formatTime(insight.timestamp)}</Text>
        </View>
      </View>
      <Text style={[styles.description, { color: theme.text }]}>{insight.description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
})
