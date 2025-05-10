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
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"

import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import { VerifyAction } from "@/components/VerifyAction"
import Colors from "@/constants/Colors"

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<any>(null)
  const [subtasks, setSubtasks] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // Animation for the save button
  const saveButtonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (id) {
      loadTaskData()
    }
  }, [id])

  const loadTaskData = async () => {
    try {
      setLoading(true)

      // Get task details including subtasks and comments
      const taskData = await taskService.getTaskById(id as string)

      if (taskData) {
        setTask(taskData)
        setEditedTitle(taskData.title)
        setEditedDescription(taskData.description || "")

        // Extract subtasks and comments
        if (taskData.subtasks) {
          setSubtasks(taskData.subtasks)
        }

        if (taskData.comments) {
          setComments(taskData.comments)
        }
      }
    } catch (error) {
      console.error("Error loading task data:", error)
      showToast("Failed to load task data", {type: 'error'})
    } finally {
      setLoading(false)
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
    try {
      await taskService.updateTask(task.id, { status: newStatus })
      setTask({ ...task, status: newStatus })
      showToast(`Task status updated to ${newStatus}`, {type:"success"})
    } catch (error) {
      console.error("Error updating task status:", error)
      showToast("Failed to update task status", {type: "error"})
    }
  }

  const handleAddComment = async () => {
    if (newComment.trim() === "") return

    try {
      const newCommentData = await taskService.createComment({
        text: newComment,
        task_id: task.id,
      })

      // Add the new comment to the list
      setComments([...comments, newCommentData])
      setNewComment("")
      showToast("Comment added", {type: "success"})
    } catch (error) {
      console.error("Error adding comment:", error)
      showToast("Failed to add comment",{type:  "error"})
    }
  }

  const handleAddSubtask = async () => {
    if (newSubtask.trim() === "") return

    try {
      const newSubtaskData = await taskService.createSubtask({
        title: newSubtask,
        task_id: task.id,
        completed: false,
      })

      // Add the new subtask to the list
      setSubtasks([...subtasks, newSubtaskData])
      setNewSubtask("")
      showToast("Subtask added", {type: "success"})
    } catch (error) {
      console.error("Error adding subtask:", error)
      showToast("Failed to add subtask", {type: "error"})
    }
  }

  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await taskService.updateSubtask(subtaskId, !completed)

      // Update the subtask in the list
      const updatedSubtasks = subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !completed } : subtask,
      )

      setSubtasks(updatedSubtasks)
    } catch (error) {
      console.error("Error toggling subtask:", error)
      showToast("Failed to update subtask",{type:  "error"})
    }
  }

  const handleEdit = async () => {
    if (isEditing) {
      // Save changes
      try {
        await taskService.updateTask(task.id, {
          title: editedTitle,
          description: editedDescription,
        })

        setTask({
          ...task,
          title: editedTitle,
          description: editedDescription,
        })

        showToast("Task updated successfully",{ type: "success"})
      } catch (error) {
        console.error("Error updating task:", error)
        showToast("Failed to update task", {type: "error"})
      }
    }

    setIsEditing(!isEditing)
  }

  const handleDeleteTask = async () => {
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteTask = async () => {
    try {
      await taskService.deleteTask(task.id)
      showToast("Task deleted successfully", {type: "success"})
      router.back()
    } catch (error) {
      console.error("Error deleting task:", error)
      showToast("Failed to delete task", {type: "error"})
    } finally {
      setShowDeleteConfirmation(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date"
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
    switch (task?.priority) {
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

  const getStatusIcon = () => {
    switch (task?.status) {
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Task Details</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    )
  }

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Task Details</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Task not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.backToProjectsButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.backToProjectsText}>Go Back</Text>
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
          <Text style={[styles.headerText, { color: theme.text }]}>Task Details</Text>
        </View>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={24} color={theme.tint} />
        </TouchableOpacity>
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
              <Text style={[styles.metaText, { color: theme.textDim }]}>Due {formatDate(task.due_date)}</Text>
            </View>

            {task.user && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color={theme.textDim} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme.textDim }]}>
                  {task.user.full_name || "Assigned User"}
                </Text>
              </View>
            )}

            <View style={[styles.priorityTag, { backgroundColor: getPriorityColor() }]}>
              <Text style={styles.priorityText}>{task.priority}</Text>
            </View>
          </View>

          {isEditing ? (
            <TextInput
              style={[styles.descriptionInput, { color: theme.text, borderColor: theme.border }]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Add a description..."
              placeholderTextColor={theme.textDim}
            />
          ) : (
            <Text style={[styles.taskDescription, { color: theme.text }]}>
              {task.description || "No description provided."}
            </Text>
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
              <Text style={[styles.statusText, { color: task.status === "todo" ? theme.text : theme.textDim }]}>
                To Do
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                task.status === "inProgress" && styles.statusButtonActive,
                task.status === "inProgress" && { backgroundColor: "rgba(255, 152, 0, 0.2)" },
              ]}
              onPress={() => handleStatusChange("inProgress")}
            >
              <Ionicons name="time-outline" size={16} color="#FF9800" style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: task.status === "inProgress" ? "#FF9800" : theme.textDim }]}>
                In Progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                task.status === "done" && styles.statusButtonActive,
                task.status === "done" && { backgroundColor: "rgba(76, 175, 80, 0.2)" },
              ]}
              onPress={() => handleStatusChange("done")}
            >
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: task.status === "done" ? "#4CAF50" : theme.textDim }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.subtasksSection, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Subtasks</Text>

          {subtasks.length > 0 ? (
            subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskItem}>
                <TouchableOpacity
                  onPress={() => toggleSubtask(subtask.id, subtask.completed)}
                  style={styles.subtaskCheckbox}
                >
                  {subtask.completed ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={theme.textDim} />
                  )}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.subtaskText,
                    { color: theme.text },
                    subtask.completed && [styles.subtaskCompleted, { color: theme.textDim }],
                  ]}
                >
                  {subtask.title}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptySubtasksContainer}>
              <Text style={[styles.emptySubtasksText, { color: theme.textDim }]}>No subtasks yet</Text>
            </View>
          )}

          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={[
                styles.addSubtaskInput,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Add a subtask..."
              placeholderTextColor={theme.textDim}
              value={newSubtask}
              onChangeText={setNewSubtask}
            />
            <TouchableOpacity
              style={[styles.addSubtaskButton, { backgroundColor: theme.tintLight }]}
              onPress={handleAddSubtask}
              disabled={newSubtask.trim() === ""}
            >
              <Ionicons name="add" size={20} color={theme.tint} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.commentsSection, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Comments</Text>

          {comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={[styles.commentItem, { borderBottomColor: theme.border }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: theme.text }]}>
                    {comment.profiles?.full_name || "User"}
                  </Text>
                  <Text style={[styles.commentTime, { color: theme.textDim }]}>
                    {formatCommentTime(comment.created_at)}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: theme.text }]}>{comment.text}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyCommentsContainer}>
              <Text style={[styles.emptyCommentsText, { color: theme.textDim }]}>No comments yet</Text>
            </View>
          )}

          <View style={styles.addCommentContainer}>
            <TextInput
              style={[
                styles.addCommentInput,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.textDim}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.addCommentButton, { backgroundColor: theme.tint }]}
              onPress={handleAddComment}
              disabled={newComment.trim() === ""}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Animated.View
        style={[styles.actionBar, { backgroundColor: theme.cardBackground, transform: [{ scale: saveButtonScale }] }]}
      >
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: "rgba(244, 67, 54, 0.1)" }]}
          onPress={handleDeleteTask}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.tint }]}
          onPress={handleEdit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Ionicons name={isEditing ? "save" : "create"} size={20} color="#fff" style={styles.saveIcon} />
          <Text style={styles.saveButtonText}>{isEditing ? "Save Changes" : "Edit Task"}</Text>
        </TouchableOpacity>
      </Animated.View>

      <VerifyAction
        visible={showDeleteConfirmation}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        destructive={true}
        onConfirm={confirmDeleteTask}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
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
  editButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  taskHeader: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 14,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
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
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusButtonActive: {
    borderColor: "transparent",
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontWeight: "500",
  },
  subtasksSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  subtaskCheckbox: {
    marginRight: 12,
  },
  subtaskText: {
    fontSize: 16,
  },
  subtaskCompleted: {
    textDecorationLine: "line-through",
  },
  emptySubtasksContainer: {
    alignItems: "center",
    padding: 16,
  },
  emptySubtasksText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  addSubtaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addSubtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  addSubtaskButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commentAuthor: {
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCommentsContainer: {
    alignItems: "center",
    padding: 16,
  },
  emptyCommentsText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  addCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  addCommentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },
  backToProjectsButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backToProjectsText: {
    color: "#fff",
    fontWeight: "600",
  },
})
