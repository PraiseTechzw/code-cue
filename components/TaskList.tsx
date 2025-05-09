import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  assignee?: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface TaskListProps {
  tasks: Task[]
  onTaskPress: (taskId: string) => void
  showAssignee?: boolean
}

export function TaskList({ tasks, onTaskPress, showAssignee }: TaskListProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return theme.success
      case "inProgress":
        return theme.warning
      case "todo":
        return theme.textDim
      default:
        return theme.textDim
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return "checkmark-circle"
      case "inProgress":
        return "time"
      case "todo":
        return "ellipse-outline"
      default:
        return "ellipse-outline"
    }
  }

  const getPriorityColor = (priority: string) => {
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

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list" size={48} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.textDim }]}>No tasks yet</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {tasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          style={[styles.taskItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => onTaskPress(task.id)}
        >
          <View style={styles.taskLeft}>
            <Ionicons
              name={getStatusIcon(task.status)}
              size={20}
              color={getStatusColor(task.status)}
              style={styles.statusIcon}
            />
            <View>
              <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
              {showAssignee && task.assignee && (
                <Text style={[styles.assigneeText, { color: theme.textDim }]}>
                  Assigned to {task.assignee.name}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.taskRight}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(task.priority) + "20" },
              ]}
            >
              <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                {task.priority.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIcon: {
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  assigneeText: {
    fontSize: 12,
    marginTop: 4,
  },
  taskRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
}) 