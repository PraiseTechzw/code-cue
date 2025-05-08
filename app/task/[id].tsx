"use client"

import { useState, useRef, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { taskService } from "@/services/taskService"
import type { Database } from "@/types/supabase"

type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  assignee: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
  comments: {
    id: string
    text: string
    user_id: string
    created_at: string
    profiles: {
      username: string | null
      full_name: string | null
      avatar_url: string | null
    }
  }[]
  subtasks: {
    id: string
    title: string
    completed: boolean
    created_at: string
  }[]
}

type TeamMember = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { user } = useAuth()
  const { showToast } = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Animation for the save button
  const saveButtonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    fetchTaskData()
  }, [id])

  const fetchTaskData = async () => {
    if (!id) return
    try {
      const data = await taskService.getTaskById(id as string)
      if (!data) {
        throw new Error("Task not found")
      }
      setTask(data)
      setEditedTitle(data.title)
      setEditedDescription(data.description || "")
    } catch (error) {
      console.error("Error fetching task:", error)
      showToast("Failed to load task data", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    if (!task) return
    setIsLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("project_id", task.project_id)

      if (error) throw error

      const members = data.map((item: any) => item.profiles)
      setTeamMembers(members)
    } catch (error) {
      console.error("Error fetching team members:", error)
      showToast("Failed to load team members", "error")
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return

    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsActionLoading(true)
            try {
              const { error } = await supabase
                .from("tasks")
                .delete()
                .eq("id", task.id)

              if (error) throw error

              showToast("Task deleted successfully", "success")
              router.back()
            } catch (error) {
              console.error("Error deleting task:", error)
              showToast("Failed to delete task", "error")
            } finally {
              setIsActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleAssignTask = async (memberId: string) => {
    if (!task) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ assignee_id: memberId })
        .eq("id", task.id)

      if (error) throw error

      const { data: memberData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", memberId)
        .single()

      if (memberData) {
        setTask({
          ...task,
          assignee: memberData,
        })
      }

      showToast("Task assigned successfully", "success")
      setShowAssignModal(false)
    } catch (error) {
      console.error("Error assigning task:", error)
      showToast("Failed to assign task", "error")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePriorityChange = async (priority: "high" | "medium" | "low") => {
    if (!task) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority })
        .eq("id", task.id)

      if (error) throw error

      setTask({ ...task, priority })
      showToast("Priority updated successfully", "success")
    } catch (error) {
      console.error("Error updating priority:", error)
      showToast("Failed to update priority", "error")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePressIn = () => {
    Animated.spring(saveButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(saveButtonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const handleBack = () => {
    router.back()
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id)

      if (error) throw error

      setTask({ ...task, status: newStatus })
      showToast("Status updated successfully", "success")
    } catch (error) {
      console.error("Error updating status:", error)
      showToast("Failed to update status", "error")
    }
  }

  const handleAddComment = async () => {
    if (!task || !user || newComment.trim() === "") return

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          text: newComment.trim(),
          task_id: task.id,
          user_id: user.id,
        })
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      setTask({
        ...task,
        comments: [...task.comments, data],
      })
      setNewComment("")
      showToast("Comment added successfully", "success")
    } catch (error) {
      console.error("Error adding comment:", error)
      showToast("Failed to add comment", "error")
    }
  }

  const handleAddSubtask = async () => {
    if (!task || newSubtask.trim() === "") return

    try {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({
          title: newSubtask.trim(),
          task_id: task.id,
          completed: false,
        })
        .select()
        .single()

      if (error) throw error

      setTask({
        ...task,
        subtasks: [...task.subtasks, data],
      })
      setNewSubtask("")
      showToast("Subtask added successfully", "success")
    } catch (error) {
      console.error("Error adding subtask:", error)
      showToast("Failed to add subtask", "error")
    }
  }

  const toggleSubtask = async (subtaskId: string) => {
    if (!task) return

    try {
      const subtask = task.subtasks.find(s => s.id === subtaskId)
      if (!subtask) return

      const { error } = await supabase
        .from("subtasks")
        .update({ completed: !subtask.completed })
        .eq("id", subtaskId)

      if (error) throw error

      const updatedSubtasks = task.subtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      )

      setTask({
        ...task,
        subtasks: updatedSubtasks,
      })
    } catch (error) {
      console.error("Error toggling subtask:", error)
      showToast("Failed to update subtask", "error")
    }
  }

  const handleEdit = async () => {
    if (!task) return

    if (isEditing) {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: editedTitle,
            description: editedDescription,
          })
          .eq("id", task.id)

        if (error) throw error

        setTask({
          ...task,
          title: editedTitle,
          description: editedDescription,
        })
        showToast("Task updated successfully", "success")
      } catch (error) {
        console.error("Error updating task:", error)
        showToast("Failed to update task", "error")
      }
    }
    setIsEditing(!isEditing)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatCommentTime = (dateString: string) => {
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

  const getPriorityColor = () => {
    if (!task) return "#757575"
    switch (task.priority) {
      case "high":
        return "#F44336"
      case "medium":
        return "#FF9800"
      case "low":
        return "#4CAF50"
      default:
        return "#757575"
    }
  }

  const getStatusIcon = () => {
    if (!task) return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
    switch (task.status) {
      case "todo":
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
      case "in_progress":
        return <Ionicons name="time-outline" size={20} color="#FF9800" />
      case "done":
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      default:
        return <Ionicons name="ellipse-outline" size={20} color={theme.text} />
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  if (!task) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.textDim} />
        <Text style={[styles.errorText, { color: theme.textDim }]}>Task not found</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Task Details</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={24} color={theme.tint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteTask} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.taskHeader, { backgroundColor: theme.cardBackground }]}>
            {isEditing ? (
              <TextInput
                style={[styles.titleInput, { color: theme.text, borderColor: theme.border }]}
                value={editedTitle}
                onChangeText={setEditedTitle}
                autoFocus
              />
            ) : (
              <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
            )}

            <View style={styles.taskMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.textDim} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme.textDim }]}>
                  Due {formatDate(task.due_date || "")}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.metaItem}
                onPress={() => {
                  fetchTeamMembers()
                  setShowAssignModal(true)
                }}
              >
                <Ionicons name="person-outline" size={16} color={theme.textDim} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme.textDim }]}>
                  {task.assignee?.full_name || task.assignee?.username || "Assign Task"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.priorityTag, { backgroundColor: getPriorityColor() }]}
                onPress={() => {
                  Alert.alert(
                    "Change Priority",
                    "Select new priority",
                    [
                      { text: "High", onPress: () => handlePriorityChange("high") },
                      { text: "Medium", onPress: () => handlePriorityChange("medium") },
                      { text: "Low", onPress: () => handlePriorityChange("low") },
                      { text: "Cancel", style: "cancel" },
                    ]
                  )
                }}
              >
                <Text style={styles.priorityText}>{task.priority}</Text>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <TextInput
                style={[styles.descriptionInput, { color: theme.text, borderColor: theme.border }]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={[styles.taskDescription, { color: theme.text }]}>{task.description}</Text>
            )}
          </View>

          <View style={[styles.statusSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Status</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  task.status === "todo" && styles.statusButtonActive,
                  task.status === "todo" && { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                ]}
                onPress={() => handleStatusChange("todo")}
              >
                <Ionicons name="ellipse-outline" size={16} color={theme.text} style={styles.statusIcon} />
                <Text style={[styles.statusText, { color: theme.text }]}>To Do</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  task.status === "in_progress" && styles.statusButtonActive,
                  task.status === "in_progress" && { backgroundColor: "rgba(255, 152, 0, 0.1)" },
                ]}
                onPress={() => handleStatusChange("in_progress")}
              >
                <Ionicons name="time-outline" size={16} color="#FF9800" style={styles.statusIcon} />
                <Text style={[styles.statusText, { color: theme.text }]}>In Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  task.status === "done" && styles.statusButtonActive,
                  task.status === "done" && { backgroundColor: "rgba(76, 175, 80, 0.1)" },
                ]}
                onPress={() => handleStatusChange("done")}
              >
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.statusIcon} />
                <Text style={[styles.statusText, { color: theme.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.subtasksSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Subtasks</Text>
            {task.subtasks.map((subtask) => (
              <TouchableOpacity
                key={subtask.id}
                style={styles.subtaskItem}
                onPress={() => toggleSubtask(subtask.id)}
              >
                <Ionicons
                  name={subtask.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={subtask.completed ? "#4CAF50" : theme.text}
                />
                <Text
                  style={[
                    styles.subtaskText,
                    { color: theme.text },
                    subtask.completed && styles.subtaskTextCompleted,
                  ]}
                >
                  {subtask.title}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.addSubtaskContainer}>
              <TextInput
                style={[styles.addSubtaskInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Add a subtask"
                placeholderTextColor={theme.textDim}
                value={newSubtask}
                onChangeText={setNewSubtask}
                onSubmitEditing={handleAddSubtask}
              />
              <TouchableOpacity
                style={[styles.addSubtaskButton, { backgroundColor: theme.tint }]}
                onPress={handleAddSubtask}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.commentsSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Comments</Text>
            {task.comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: theme.text }]}>
                    {comment.profiles.full_name || comment.profiles.username || "Unknown User"}
                  </Text>
                  <Text style={[styles.commentTime, { color: theme.textDim }]}>
                    {formatCommentTime(comment.created_at)}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: theme.text }]}>{comment.text}</Text>
              </View>
            ))}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={[styles.addCommentInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Add a comment"
                placeholderTextColor={theme.textDim}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.addCommentButton, { backgroundColor: theme.tint }]}
                onPress={handleAddComment}
              >
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={showAssignModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAssignModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Assign Task</Text>
              {isLoadingMembers ? (
                <ActivityIndicator size="large" color={theme.tint} />
              ) : (
                <ScrollView style={styles.memberList}>
                  {teamMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleAssignTask(member.id)}
                    >
                      <Text style={[styles.memberName, { color: theme.text }]}>
                        {member.full_name || member.username || "Unknown User"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.tint }]}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  taskHeader: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 14,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 100,
  },
  statusSection: {
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  statusButtonActive: {
    borderWidth: 1,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  subtasksSection: {
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  subtaskText: {
    fontSize: 16,
    marginLeft: 8,
  },
  subtaskTextCompleted: {
    textDecorationLine: "line-through",
    color: "#757575",
  },
  addSubtaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addSubtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  addSubtaskButton: {
    padding: 8,
    borderRadius: 8,
  },
  commentsSection: {
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "500",
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  addCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  addCommentButton: {
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  memberList: {
    maxHeight: 300,
  },
  memberItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberName: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
