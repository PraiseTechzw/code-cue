import { StyleSheet, View, Text, TouchableOpacity } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface TaskItemProps {
  task: {
    id: string
    title: string
    due_date?: string
    priority: string
  }
  status: "todo" | "inProgress" | "done"
}

export function TaskItem({ task, status }: TaskItemProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const handlePress = () => {
    router.push(`/task/${task.id}`)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No due date"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.cardBackground }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{getStatusIcon()}</View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={theme.textDim} />
            <Text style={[styles.date, { color: theme.textDim }]}>{formatDate(task.due_date)}</Text>
          </View>
          <View style={[styles.priorityTag, { backgroundColor: getPriorityColor() }]}>
            <Text style={styles.priorityText}>{task.priority}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    marginLeft: 4,
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
