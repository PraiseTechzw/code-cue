import { StyleSheet, View, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface CommitItemProps {
  commit: {
    id: string
    message: string
    author: string
    timestamp: string
    hash: string
    repo: string
  }
  onLinkPress: () => void
}

export function CommitItem({ commit, onLinkPress }: CommitItemProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

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
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.repo, { color: theme.textDim }]}>{commit.repo}</Text>
          <Text style={[styles.hash, { color: theme.textDim }]}>{commit.hash}</Text>
        </View>
        <Text style={[styles.time, { color: theme.textDim }]}>{formatTime(commit.timestamp)}</Text>
      </View>

      <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
        {commit.message}
      </Text>

      <View style={styles.footer}>
        <View style={styles.author}>
          <Ionicons name="person-outline" size={14} color={theme.textDim} style={styles.authorIcon} />
          <Text style={[styles.authorName, { color: theme.textDim }]}>{commit.author}</Text>
        </View>

        <TouchableOpacity style={[styles.linkButton, { backgroundColor: theme.tintLight }]} onPress={onLinkPress}>
          <Ionicons name="link-outline" size={14} color={theme.tint} style={styles.linkIcon} />
          <Text style={[styles.linkText, { color: theme.tint }]}>Link to Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  repo: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 8,
  },
  hash: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorIcon: {
    marginRight: 4,
  },
  authorName: {
    fontSize: 12,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  linkIcon: {
    marginRight: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "500",
  },
})
