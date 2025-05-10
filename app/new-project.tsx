"use client"

import { useState, useRef, useEffect } from "react"
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
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import DateTimePicker from "@react-native-community/datetimepicker"

import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"
import { ConnectionStatus } from "@/components/ConnectionStatus"

export default function NewProjectScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Animation for the create button
  const buttonOpacity = useRef(new Animated.Value(0.5)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const inputAnim = useRef(new Animated.Value(0)).current

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const online = await projectService.isOnline()
      setIsOffline(!online)
    }

    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Animate input fields on mount
  useEffect(() => {
    Animated.timing(inputAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  // Update button opacity based on form validity
  const isFormValid = projectName.trim() !== "" && description.trim() !== ""

  useEffect(() => {
    Animated.timing(buttonOpacity, {
      toValue: isFormValid ? 1 : 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isFormValid])

  const handlePressIn = () => {
    if (isFormValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    } else if (projectName.length > 50) {
      newErrors.projectName = "Project name must be less than 50 characters"
    }

    if (description.trim() === "") {
      newErrors.description = "Description is required"
    }

    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = "End date must be after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateProject = async () => {
    if (validateForm()) {
      try {
        setLoading(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        // Format dates for storage
        const formattedStartDate = startDate ? startDate.toISOString() : null
        const formattedEndDate = endDate ? endDate.toISOString() : null

        // Create the project
        const newProject = await projectService.createProject({
          name: projectName,
          description,
          progress: 0,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        })

        showToast("Project created successfully", "success")

        // Navigate back to projects screen
        router.push("/projects")
      } catch (error) {
        console.error("Error creating project:", error)

        if (isOffline) {
          showToast("Project saved offline. Will sync when online.", "info")
          router.push("/projects")
        } else {
          showToast("Failed to create project", "error")
        }
      } finally {
        setLoading(false)
      }
    } else {
      // Shake animation for invalid form
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Animated.sequence([
        Animated.timing(inputAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start()
    }
  }

  const handleBack = () => {
    if (projectName.trim() !== "" || description.trim() !== "") {
      Alert.alert("Discard Changes", "Are you sure you want to discard your changes?", [
        { text: "Cancel", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.tintLight }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
            <Text style={[styles.offlineText, { color: theme.tint }]}>
              You're offline. Changes will be saved locally.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>New Project</Text>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateX: inputAnim }] }]}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Project Name*</Text>
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
              maxLength={50}
              accessibilityLabel="Project name input"
              accessibilityHint="Enter the name of your project"
            />
            {errors.projectName ? (
              <Text style={styles.errorText}>{errors.projectName}</Text>
            ) : (
              <Text style={[styles.charCount, { color: theme.textDim }]}>{projectName.length}/50</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description*</Text>
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
              accessibilityLabel="Project description input"
              accessibilityHint="Enter a description for your project"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.dateContainer}>
            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>Start Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowStartDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select start date"
                accessibilityHint="Opens date picker to select project start date"
              >
                <Text style={{ color: startDate ? theme.text : theme.textDim }}>
                  {startDate ? formatDate(startDate) : "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false)
                    if (selectedDate) {
                      setStartDate(selectedDate)
                    }
                  }}
                />
              )}
            </View>

            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>End Date (Optional)</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  errors.endDate && styles.inputError,
                ]}
                onPress={() => setShowEndDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select end date"
                accessibilityHint="Opens date picker to select project end date"
              >
                <Text style={{ color: endDate ? theme.text : theme.textDim }}>
                  {endDate ? formatDate(endDate) : "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
              {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false)
                    if (selectedDate) {
                      setEndDate(selectedDate)
                    }
                  }}
                />
              )}
            </View>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.tint }]}
              onPress={handleCreateProject}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create project"
              accessibilityHint="Creates a new project with the entered information"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.createIcon} />
                  <Text style={styles.createButtonText}>Create Project</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.requiredFieldsNote, { color: theme.textDim }]}>* Required fields</Text>
        </Animated.View>
      </ScrollView>

      <ConnectionStatus />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
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
  charCount: {
    fontSize: 12,
    textAlign: "right",
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
  createButton: {
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
  createIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  requiredFieldsNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
})
