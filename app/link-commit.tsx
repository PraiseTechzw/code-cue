"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Animated,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { githubService } from "@/services/githubService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function LinkCommitScreen() {
  const { commitId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [commit, setCommit] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(50))[0]

  useEffect(() => {
    if (commitId) {
      loadData()
    }
  }, [commitId])

  useEffect(() => {
    if (!loading && commit) {
      // Animate in the content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [loading, commit])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get commit details
      const commitData = await githubService.getCommitById(commitId as string)
      setCommit(commitData)

      // Get tasks that are not completed
      const tasksData = await taskService.getTasks({ status: ["todo", "inProgress"] })

      // Sort tasks by project and status
      tasksData.sort((a, b) => {
        // First sort by project name
        if (a.project?.name && b.project?.name) {
          if (a.project.name < b.project.name) return -1
          if (a.project.name > b.project.name) return 1
        }

        // Then sort by status (todo first, then inProgress)
        if (a.status === "todo" && b.status !== "todo") return -1
        if (a.status !== "todo" && b.status === "todo") return 1

        // Finally sort by title
        return a.title.localeCompare(b.title)
      })

      setTasks(tasksData)
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTask = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedTaskId(taskId === selectedTaskId ? null : taskId)
  }

  const handleLinkCommit = async () => {
    if (!selectedTaskId) {
      showToast("Please select a task", "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    try {
      setLinking(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Link commit to task
      await githubService.linkCommitToTask(commit.id, selectedTaskId)

      showToast("Commit linked to task successfully", "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Navigate back
      router.back()
    } catch (error) {
      console.error("Error linking commit:", error)
      showToast("Failed to link commit", "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLinking(false)
    }
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
      case "inProgress":
        return <Ionicons name="time-outline" size={20} color="#FF9800" />
      default:
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Link Commit</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim, marginTop: 16 }]}>Loading commit details...</Text>
        </View>
      </View>
    )
  }

  if (!commit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Link Commit</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Commit not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.errorButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: theme.text }]}>Link Commit</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Animated.View
          style={[
            styles.commitCard,
            {
              backgroundColor: theme.cardBackground,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.commitHeader}>
            <View style={styles.commitHeaderLeft}>
              <Text style={[styles.repoName, { color: theme.textDim }]}>{commit.repository?.name || "Repository"}</Text>
              <Text style={[styles.commitHash, { color: theme.textDim }]}>
                {commit.commit_id?.substring(0, 7) || ""}
              </Text>
            </View>
          </View>
          <Text style={[styles.commitMessage, { color: theme.text }]}>{commit.message}</Text>
          <View style={styles.commitMeta}>
            <View style={styles.authorContainer}>
              <Ionicons name="person-outline" size={14} color={theme.textDim} style={styles.authorIcon} />
              <Text style={[styles.authorName, { color: theme.textDim }]}>{commit.author}</Text>
            </View>
            <Text style={[styles.commitDate, { color: theme.textDim }]}>
              {new Date(commit.committed_at).toLocaleDateString()}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Task</Text>

          {tasks.length > 0 ? (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.taskItem,
                    { backgroundColor: theme.cardBackground },
                    selectedTaskId === item.id && { borderColor: theme.tint, borderWidth: 2 },
                  ]}
                  onPress={() => handleSelectTask(item.id)}
                >
                  <View style={styles.taskItemLeft}>
                    {getTaskStatusIcon(item.status)}
                    <View style={styles.taskDetails}>
                      <Text style={[styles.taskTitle, { color: theme.text }]}>{item.title}</Text>
                      {item.project && (
                        <Text style={[styles.projectName, { color: theme.textDim }]}>{item.project.name}</Text>
                      )}
                    </View>
                  </View>
                  {selectedTaskId === item.id && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              contentContainerStyle={styles.tasksList}
            />
          ) : (
            <View style={styles.emptyTasksContainer}>
              <Ionicons name="document-text-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>No active tasks found</Text>
              <Text style={[styles.emptyTasksSubtext, { color: theme.textDim }]}>
                Create a task first to link this commit.
              </Text>
              <TouchableOpacity
                style={[styles.createTaskButton, { backgroundColor: theme.tint }]}
                onPress={() => router.push("/add-task")}
              >
                <Ionicons name="add-outline" size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.createTaskButtonText}>Create New Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: theme.tint }, (!selectedTaskId || linking) && { opacity: 0.6 }]}
          onPress={handleLinkCommit}
          disabled={!selectedTaskId || linking}
        >
          {linking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="link" size={20} color="#fff" style={styles.linkIcon} />
              <Text style={styles.linkButtonText}>Link to Selected Task</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  commitCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commitHeaderLeft: {
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
  commitMessage: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    lineHeight: 22,
  },
  commitMeta: {
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
  authorName: {
    fontSize: 14,
  },
  commitDate: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskDetails: {
    marginLeft: 12,
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  projectName: {
    fontSize: 12,
    marginTop: 4,
  },
  tasksList: {
    paddingBottom: 100,
  },
  emptyTasksContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTasksText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 16,
  },
  emptyTasksSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  createTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonIcon: {
    marginRight: 6,
  },
  createTaskButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  linkIcon: {
    marginRight: 8,
  },
  linkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
})
