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
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import DateTimePicker from '@react-native-community/datetimepicker'
import Colors from "@/constants/Colors"
import { projectService } from "@/services/projectService"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { user } = useAuth()
  const { showToast } = useToast()

  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Animation for the save button
  const buttonOpacity = new Animated.Value(0.5)
  const buttonScale = new Animated.Value(1)

  useEffect(() => {
    fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      const project = await projectService.getProjectById(id as string)
      setProjectName(project.name)
      setDescription(project.description || "")
      setStartDate(project.start_date ? new Date(project.start_date) : null)
      setEndDate(project.end_date ? new Date(project.end_date) : null)
    } catch (error) {
      console.error("Error fetching project:", error)
      showToast("Failed to load project data", "error")
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  // Update button opacity based on form validity
  const isFormValid = projectName.trim() !== "" && description.trim() !== ""
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

    if (projectName.trim() === "") {
      newErrors.projectName = "Project name is required"
    }

    if (description.trim() === "") {
      newErrors.description = "Description is required"
    }

    if (startDate && endDate && startDate > endDate) {
      newErrors.dates = "End date must be after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProject = async () => {
    if (!validateForm() || !user) return

    setIsSaving(true)
    try {
      const project = {
        name: projectName.trim(),
        description: description.trim(),
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
      }

      await projectService.updateProject(id as string, project)
      showToast("Project updated successfully!", "success")
      router.back()
    } catch (error) {
      console.error("Error updating project:", error)
      showToast("Failed to update project. Please try again.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date"
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric" 
    })
  }

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      setEndDate(selectedDate)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
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
          <Text style={[styles.title, { color: theme.text }]}>Edit Project</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Project Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.projectName && styles.inputError,
              ]}
              placeholder="Enter project name"
              placeholderTextColor={theme.textDim}
              value={projectName}
              onChangeText={setProjectName}
            />
            {errors.projectName && <Text style={styles.errorText}>{errors.projectName}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.description && styles.inputError,
              ]}
              placeholder="Enter project description"
              placeholderTextColor={theme.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.dateContainer}>
            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>Start Date</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={{ color: startDate ? theme.text : theme.textDim }}>{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>End Date</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={{ color: endDate ? theme.text : theme.textDim }}>{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.saveButton, 
                { backgroundColor: theme.tint },
                isSaving && styles.disabledButton
              ]}
              onPress={handleSaveProject}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || isSaving}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={20} color="#fff" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}
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
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateField: {
    width: "48%",
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saveButton: {
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
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
}) 