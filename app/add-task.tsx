"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import DateTimePicker from '@react-native-community/datetimepicker'
import Colors from "@/constants/Colors"
import { taskService } from "@/services/taskService"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"] & {
  profiles: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

type Project = Database["public"]["Tables"]["projects"]["Row"]

type TeamMember = {
  id: string
  name: string
  avatar: string | null
}

export default function AddTaskScreen() {
  const { projectId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { user } = useAuth()
  const { showToast } = useToast()

  const [taskTitle, setTaskTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [showAssigneeModal, setShowAssigneeModal] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Animation for the add button
  const buttonOpacity = new Animated.Value(0.5)
  const buttonScale = new Animated.Value(1)

  useEffect(() => {
    fetchProjectData()
  }, [projectId])

  const fetchProjectData = async () => {
    if (!projectId) return
    try {
      // Fetch project data directly from the database
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single()

      if (projectError) {
        console.error("Error fetching project:", projectError)
        showToast("Failed to load project data", "error")
        return
      }
      setProject(projectData)

      // Fetch project members from the database
      const { data: projectMembers, error: membersError } = await supabase
        .from("project_members")
        .select(`
          user_id,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("project_id", projectId)
        .returns<ProjectMember[]>()

      if (membersError) {
        console.error("Error fetching members:", membersError)
        showToast("Failed to load team members", "error")
        return
      }

      // Transform the data to match our team members format
      const members = projectMembers.map((member) => ({
        id: member.user_id,
        name: member.profiles.full_name || member.profiles.username || "Unknown User",
        avatar: member.profiles.avatar_url,
      }))

      // Add the current user if they're not already in the list
      if (user && !members.some(m => m.id === user.id)) {
        members.unshift({
          id: user.id,
          name: "You",
          avatar: null,
        })
      }

      setTeamMembers(members)
    } catch (error) {
      console.error("Error fetching project data:", error)
      showToast("Failed to load project data", "error")
      // Don't navigate back, just show the error
    }
  }

  // Update button opacity based on form validity
  const isFormValid = taskTitle.trim() !== "" && project !== null
  buttonOpacity.setValue(isFormValid ? 1 : 0.5)

  const handlePressIn = () => {
    if (isFormValid) {
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start()
    }
  }

  const handlePressOut = () => {
    if (isFormValid) {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start()
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!project) {
      newErrors.project = "Project not found"
      return false
    }

    if (taskTitle.trim() === "") {
      newErrors.taskTitle = "Task title is required"
    }

    if (dueDate && dueDate < new Date()) {
      newErrors.dueDate = "Due date cannot be in the past"
    }

    // Validate due date against project timeline
    if (dueDate && project.start_date && project.end_date) {
      const projectStart = new Date(project.start_date)
      const projectEnd = new Date(project.end_date)
      
      if (dueDate < projectStart) {
        newErrors.dueDate = "Due date cannot be before project start date"
      } else if (dueDate > projectEnd) {
        newErrors.dueDate = "Due date cannot be after project end date"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddTask = async () => {
    if (!validateForm() || !user || !projectId || !project) return

    setIsLoading(true)
    try {
      const task = {
        title: taskTitle.trim(),
        description: description.trim(),
        due_date: dueDate?.toISOString() || null,
        priority,
        status: "todo",
        project_id: projectId as string,
        assignee_id: selectedAssignee || user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await taskService.createTask(task)
      showToast("Task created successfully!", "success")
      router.back()
    } catch (error) {
      console.error("Error creating task:", error)
      showToast("Failed to create task. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Select due date"
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric" 
    })
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDueDate(selectedDate)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "#4CAF50"
      case "medium":
        return "#FF9800"
      case "high":
        return "#F44336"
      default:
        return theme.textDim
    }
  }

  const handleSelectAssignee = (assigneeId: string) => {
    setSelectedAssignee(assigneeId)
    setShowAssigneeModal(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Add New Task</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Task Title</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.taskTitle && styles.inputError,
              ]}
              placeholder="Enter task title"
              placeholderTextColor={theme.textDim}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />
            {errors.taskTitle && <Text style={styles.errorText}>{errors.taskTitle}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Enter task description (optional)"
              placeholderTextColor={theme.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Due Date</Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                errors.dueDate && styles.inputError,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: dueDate ? theme.text : theme.textDim }}>{formatDate(dueDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
            </TouchableOpacity>
            {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
            <View style={styles.priorityContainer}>
              {(["low", "medium", "high"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && [styles.priorityButtonActive, { backgroundColor: `${getPriorityColor(p)}20` }],
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(p) }]} />
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priority === p ? getPriorityColor(p) : theme.textDim },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Assignee</Text>
            <TouchableOpacity
              style={[styles.assigneeButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowAssigneeModal(true)}
            >
              <Ionicons name="person-outline" size={20} color={theme.tint} />
              <Text style={[styles.assigneeText, { color: theme.tint }]}>
                {selectedAssignee
                  ? teamMembers.find(m => m.id === selectedAssignee)?.name || "Select assignee"
                  : "Select assignee"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: theme.tint },
                isLoading && styles.disabledButton,
              ]}
              onPress={handleAddTask}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" style={styles.loadingIndicator} />
              ) : (
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
              )}
              <Text style={styles.addButtonText}>
                {isLoading ? "Creating..." : "Add Task"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      <Modal
        visible={showAssigneeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssigneeModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Assignee</Text>
            <ScrollView style={styles.assigneeList}>
              {teamMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.assigneeItem,
                    selectedAssignee === member.id && { backgroundColor: `${theme.tint}20` },
                  ]}
                  onPress={() => handleSelectAssignee(member.id)}
                >
                  {member.avatar ? (
                    <Image
                      source={{ uri: member.avatar }}
                      style={styles.assigneeAvatar}
                    />
                  ) : (
                    <Ionicons
                      name="person-circle-outline"
                      size={24}
                      color={selectedAssignee === member.id ? theme.tint : theme.textDim}
                    />
                  )}
                  <Text
                    style={[
                      styles.assigneeItemText,
                      { color: selectedAssignee === member.id ? theme.tint : theme.text },
                    ]}
                  >
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.tint }]}
              onPress={() => setShowAssigneeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  inputError: {
    borderColor: "#F44336",
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityButtonActive: {
    borderColor: "transparent",
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  priorityText: {
    fontWeight: "500",
  },
  assigneeButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  assigneeText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addIcon: {
    marginRight: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  assigneeList: {
    maxHeight: 300,
  },
  assigneeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assigneeItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
})
