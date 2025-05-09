"use client"

import { useState } from "react"
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
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"

import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function AddTaskScreen() {
  const { projectId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [taskTitle, setTaskTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  // Animation for the add button
  const buttonOpacity = new Animated.Value(0.5)
  const buttonScale = new Animated.Value(1)

  // Update button opacity based on form validity
  const isFormValid = taskTitle.trim() !== ""
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

    if (taskTitle.trim() === "") {
      newErrors.taskTitle = "Task title is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddTask = async () => {
    if (validateForm()) {
      try {
        setLoading(true)

        // Create the task
        const newTask = await taskService.createTask({
          title: taskTitle,
          description,
          due_date: dueDate || null,
          priority,
          project_id: projectId as string,
          status: "todo",
        })

        showToast("Task created successfully", { type: "success" })

        // Navigate back to project details
        router.push(`/project/${projectId}`)
      } catch (error) {
        console.error("Error creating task:", error)
        showToast("Failed to create task", { type: "error" })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    router.back()
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
              style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            >
              <Text style={{ color: dueDate ? theme.text : theme.textDim }}>{dueDate || "Select due date"}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
            <View style={styles.priorityContainer}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Low" && styles.priorityButtonActive,
                  priority === "Low" && { backgroundColor: "rgba(76, 175, 80, 0.2)" },
                ]}
                onPress={() => setPriority("Low")}
              >
                <View style={[styles.priorityDot, { backgroundColor: "#4CAF50" }]} />
                <Text style={[styles.priorityText, { color: priority === "Low" ? "#4CAF50" : theme.textDim }]}>
                  Low
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Medium" && styles.priorityButtonActive,
                  priority === "Medium" && { backgroundColor: "rgba(255, 152, 0, 0.2)" },
                ]}
                onPress={() => setPriority("Medium")}
              >
                <View style={[styles.priorityDot, { backgroundColor: "#FF9800" }]} />
                <Text style={[styles.priorityText, { color: priority === "Medium" ? "#FF9800" : theme.textDim }]}>
                  Medium
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "High" && styles.priorityButtonActive,
                  priority === "High" && { backgroundColor: "rgba(244, 67, 54, 0.2)" },
                ]}
                onPress={() => setPriority("High")}
              >
                <View style={[styles.priorityDot, { backgroundColor: "#F44336" }]} />
                <Text style={[styles.priorityText, { color: priority === "High" ? "#F44336" : theme.textDim }]}>
                  High
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.tint }]}
              onPress={handleAddTask}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
                  <Text style={styles.addButtonText}>Add Task</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
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
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
