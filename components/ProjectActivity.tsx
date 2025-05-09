import { View, Text, StyleSheet, Image } from "react-native"
import { useColorScheme } from "react-native"
import { format, formatDistanceToNow } from "date-fns"
import Colors from "@/constants/Colors"

interface Activity {
  id: string
  type: string
  description: string
  user: {
    name: string
    avatar_url?: string
  }
  timestamp: string
}

interface ProjectActivityProps {
  activities: Activity[]
}

export function ProjectActivity({ activities }: ProjectActivityProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textDim }]}>No activity yet</Text>
      </View>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const distance = formatDistanceToNow(date, { addSuffix: true })
    const fullDate = format(date, "MMM d, yyyy 'at' h:mm a")
    return { distance, fullDate }
  }

  return (
    <View style={styles.container}>
      {activities.map((activity) => {
        const { distance, fullDate } = formatTimestamp(activity.timestamp)
        return (
          <View key={activity.id} style={[styles.activityItem, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.activityHeader}>
              {activity.user.avatar_url ? (
                <Image source={{ uri: activity.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tintLight }]}>
                  <Text style={[styles.avatarText, { color: theme.tint }]}>
                    {activity.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.activityInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{activity.user.name}</Text>
                <Text style={[styles.timestamp, { color: theme.textDim }]} numberOfLines={1}>
                  {distance}
                </Text>
              </View>
            </View>
            <Text style={[styles.description, { color: theme.text }]}>{activity.description}</Text>
            <Text style={[styles.fullDate, { color: theme.textDim }]}>{fullDate}</Text>
          </View>
        )
      })}
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
  },
  activityItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  fullDate: {
    fontSize: 12,
  },
}) 