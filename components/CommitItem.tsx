import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
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
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="git-commit-outline" size={20} color={theme.tint} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, { color: theme.text }]}>{commit.message}</Text>
        <View style={styles.metaContainer}>
          <Text style={[styles.author, { color: theme.textDim }]}>{commit.author}</Text>
          <Text style={[styles.dot, { color: theme.textDim }]}>•</Text>
          <Text style={[styles.hash, { color: theme.textDim }]}>{commit.hash}</Text>
          <Text style={[styles.dot, { color: theme.textDim }]}>•</Text>
          <Text style={[styles.timestamp, { color: theme.textDim }]}>{formatDate(commit.timestamp)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.linkButton, { backgroundColor: theme.tintLight }]}
        onPress={onLinkPress}
        activeOpacity={0.7}
      >
        <Ionicons name="link-outline" size={18} color={theme.tint} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    lineHeight: 22,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  author: {
    fontSize: 12,
  },
  hash: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  timestamp: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  linkButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
})
