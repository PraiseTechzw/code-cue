import { StyleSheet, View, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
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
  onLinkPress?: () => void
  onPress?: () => void
  linked?: boolean
}

export function CommitItem({ commit, onLinkPress, onPress, linked = false }: CommitItemProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const formatCommitMessage = (message: string) => {
    // Truncate long messages
    if (message.length > 100) {
      return message.substring(0, 100) + "..."
    }
    return message
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
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

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress()
    }
  }

  const handleLinkPress = () => {
    if (onLinkPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onLinkPress()
    }
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.cardBackground }]}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole="button"
      accessibilityLabel={`Commit: ${commit.message}`}
      accessibilityHint={onPress ? "Double tap to view commit details" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.repoName, { color: theme.textDim }]}>{commit.repo}</Text>
          <Text style={[styles.commitHash, { color: theme.textDim }]}>{commit.hash}</Text>
        </View>
        <Text style={[styles.timestamp, { color: theme.textDim }]}>{formatTimestamp(commit.timestamp)}</Text>
      </View>

      <Text style={[styles.message, { color: theme.text }]}>{formatCommitMessage(commit.message)}</Text>

      <View style={styles.footer}>
        <View style={styles.authorContainer}>
          <Ionicons name="person-outline" size={14} color={theme.textDim} style={styles.authorIcon} />
          <Text style={[styles.author, { color: theme.textDim }]}>{commit.author}</Text>
        </View>

        {onLinkPress && (
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: linked ? theme.successLight : theme.tintLight }]}
            onPress={handleLinkPress}
            accessibilityRole="button"
            accessibilityLabel={linked ? "Linked to task" : "Link to task"}
            accessibilityHint={linked ? "This commit is linked to a task" : "Link this commit to a task"}
          >
            <Ionicons
              name={linked ? "link" : "link-outline"}
              size={14}
              color={linked ? theme.success : theme.tint}
              style={styles.linkIcon}
            />
            <Text style={[styles.linkText, { color: linked ? theme.success : theme.tint }]}>
              {linked ? "Linked" : "Link"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  repoName: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  commitHash: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  timestamp: {
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
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorIcon: {
    marginRight: 4,
  },
  author: {
    fontSize: 14,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  linkIcon: {
    marginRight: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "500",
  },
})
